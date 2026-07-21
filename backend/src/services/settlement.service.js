const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { getDriverBorneExpensesTotal } = require('./expense.service');
const { DRIVER_COLLECTED_METHODS } = require('../utils/paymentMethod.util');
const { sendPushToUser } = require('../utils/push.util');

const SETTLEMENT_INCLUDE = {
  driver: { select: { id: true, fullName: true, email: true } },
  createdByUser: { select: { id: true, fullName: true } },
  paidByUser: { select: { id: true, fullName: true } },
};

async function findSettlementOrThrow(settlementId) {
  const settlement = await prisma.settlement.findUnique({ where: { id: settlementId }, include: SETTLEMENT_INCLUDE });
  if (!settlement) {
    throw new AppError('Settlement not found', 404, 'NOT_FOUND');
  }
  return settlement;
}

async function listSettlements({ driverId, status, page, pageSize }) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 20;
  const where = { ...(driverId && { driverId }), ...(status && { status }) };

  const [total, settlements] = await Promise.all([
    prisma.settlement.count({ where }),
    prisma.settlement.findMany({
      where,
      include: SETTLEMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
  ]);

  return { settlements, total, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) };
}

async function getSettlementById(settlementId) {
  return findSettlementOrThrow(settlementId);
}

// Sums the driver's already-frozen commissionAmount/driverNetAmount snapshot
// fields (see ride.service.js#snapshotCommission) over completed rides in
// [periodStart, periodEnd) - never the driver's *current* commissionRate, so
// a later rate change never changes what a past period actually owed.
async function generateSettlement({ driverId, periodStart, periodEnd, notes }, createdByUserId) {
  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.role !== 'DRIVER') {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  if (end <= start) {
    throw new AppError('periodEnd must be after periodStart', 422, 'VALIDATION_ERROR');
  }

  const [cashAgg, electronicAgg, expensesOwed] = await Promise.all([
    prisma.ride.aggregate({
      where: { driverId, status: 'COMPLETED', paymentMethod: { in: DRIVER_COLLECTED_METHODS }, completedAt: { gte: start, lt: end } },
      _sum: { commissionAmount: true },
    }),
    prisma.ride.aggregate({
      where: { driverId, status: 'COMPLETED', paymentMethod: { notIn: DRIVER_COLLECTED_METHODS }, completedAt: { gte: start, lt: end } },
      _sum: { driverNetAmount: true },
    }),
    // Spec 10.4/19.5: expenses the driver bears (DRIVER/SHARED) over the
    // same period reduce what the company owes them, same direction as
    // cashCommissionOwed.
    getDriverBorneExpensesTotal(driverId, { from: start, to: end }),
  ]);

  const cashCommissionOwed = cashAgg._sum.commissionAmount || 0;
  const cardNetOwed = electronicAgg._sum.driverNetAmount || 0;
  const netAmount = cardNetOwed - cashCommissionOwed - expensesOwed;

  // Auto-pay from the driver's recharged balance (see User.creditBalance,
  // funded by confirmed WalletTopUps) before falling back to the manual
  // mobile-money declare/confirm flow - only meaningful when the driver owes
  // money (netAmount < 0), capped at whatever balance is actually available.
  const amountOwed = Math.max(0, -netAmount);
  const creditApplied = Math.min(driver.creditBalance, amountOwed);
  const fullyPaidByCredit = creditApplied > 0 && creditApplied >= amountOwed;

  const [settlement] = await prisma.$transaction([
    prisma.settlement.create({
      data: {
        driverId,
        periodStart: start,
        periodEnd: end,
        cashCommissionOwed,
        cardNetOwed,
        expensesOwed,
        netAmount,
        creditApplied,
        ...(fullyPaidByCredit && { status: 'PAID', paidAt: new Date() }),
        notes,
        createdByUserId,
      },
      include: SETTLEMENT_INCLUDE,
    }),
    ...(creditApplied > 0
      ? [prisma.user.update({ where: { id: driverId }, data: { creditBalance: { decrement: creditApplied } } })]
      : []),
  ]);

  if (fullyPaidByCredit) {
    sendPushToUser(driverId, {
      title: 'Règlement payé',
      body: `Votre règlement de ${amountOwed} a été payé automatiquement depuis votre solde rechargé.`,
      data: { settlementId: settlement.id, type: 'settlement:paid' },
    });
  } else if (creditApplied > 0) {
    sendPushToUser(driverId, {
      title: 'Solde appliqué à votre règlement',
      body: `${creditApplied} de votre solde ont été déduits. Il vous reste ${amountOwed - creditApplied} à régler.`,
      data: { settlementId: settlement.id, type: 'settlement:credit-applied' },
    });
  }

  return settlement;
}

async function markSettlementPaid(settlementId, paidByUserId) {
  const settlement = await findSettlementOrThrow(settlementId);
  if (settlement.status !== 'PENDING') {
    throw new AppError('Only a pending settlement can be marked paid', 409, 'CONFLICT');
  }
  const updated = await prisma.settlement.update({
    where: { id: settlementId },
    data: { status: 'PAID', paidAt: new Date(), paidByUserId },
    include: SETTLEMENT_INCLUDE,
  });

  sendPushToUser(updated.driverId, {
    title: 'Paiement confirmé',
    body: 'Votre règlement a été confirmé par l\'administrateur.',
    data: { settlementId: updated.id, type: 'settlement:paid' },
  });

  return updated;
}

// Driver self-service "I paid" declaration - only meaningful when the driver
// is the one who owes money (netAmount < 0, i.e. cash-equivalent commission +
// expenses exceed what the company owes back on electronic rides). Doesn't
// flip status on its own; an admin still confirms via markSettlementPaid
// above, same two-step shape as a ride's declare/confirm flow.
async function declareSettlementPaidByDriver(driverId, settlementId, paymentMethod) {
  const settlement = await findSettlementOrThrow(settlementId);
  if (settlement.driverId !== driverId) {
    throw new AppError('This settlement does not belong to you', 403, 'FORBIDDEN');
  }
  if (settlement.status !== 'PENDING') {
    throw new AppError('Only a pending settlement can be declared paid', 409, 'CONFLICT');
  }
  if (settlement.netAmount >= 0) {
    throw new AppError('You do not owe anything on this settlement', 409, 'CONFLICT');
  }
  if (settlement.driverMarkedPaidAt) {
    throw new AppError('You have already declared this settlement as paid', 409, 'CONFLICT');
  }

  return prisma.settlement.update({
    where: { id: settlementId },
    data: { driverMarkedPaidAt: new Date(), driverPaymentMethod: paymentMethod },
    include: SETTLEMENT_INCLUDE,
  });
}

async function cancelSettlement(settlementId) {
  const settlement = await findSettlementOrThrow(settlementId);
  if (settlement.status !== 'PENDING') {
    throw new AppError('Only a pending settlement can be cancelled', 409, 'CONFLICT');
  }
  return prisma.settlement.update({
    where: { id: settlementId },
    data: { status: 'CANCELLED' },
    include: SETTLEMENT_INCLUDE,
  });
}

module.exports = {
  listSettlements,
  getSettlementById,
  generateSettlement,
  markSettlementPaid,
  cancelSettlement,
  declareSettlementPaidByDriver,
};
