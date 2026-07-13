const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { getDriverBorneExpensesTotal } = require('./expense.service');
const { DRIVER_COLLECTED_METHODS } = require('../utils/paymentMethod.util');

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

  return prisma.settlement.create({
    data: {
      driverId,
      periodStart: start,
      periodEnd: end,
      cashCommissionOwed,
      cardNetOwed,
      expensesOwed,
      netAmount: cardNetOwed - cashCommissionOwed - expensesOwed,
      notes,
      createdByUserId,
    },
    include: SETTLEMENT_INCLUDE,
  });
}

async function markSettlementPaid(settlementId, paidByUserId) {
  const settlement = await findSettlementOrThrow(settlementId);
  if (settlement.status !== 'PENDING') {
    throw new AppError('Only a pending settlement can be marked paid', 409, 'CONFLICT');
  }
  return prisma.settlement.update({
    where: { id: settlementId },
    data: { status: 'PAID', paidAt: new Date(), paidByUserId },
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

module.exports = { listSettlements, getSettlementById, generateSettlement, markSettlementPaid, cancelSettlement };
