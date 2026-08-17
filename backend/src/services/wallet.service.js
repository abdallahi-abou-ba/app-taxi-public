const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { sendPushToUser } = require('../utils/push.util');
const { getMerchantCode } = require('./appSetting.service');
const { WALLET_TOPUP_PRESET_AMOUNTS } = require('../utils/walletTopup.util');

const TOPUP_INCLUDE = {
  driver: { select: { id: true, fullName: true, phone: true } },
  confirmedByUser: { select: { id: true, fullName: true } },
};

async function findTopUpOrThrow(topUpId) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId }, include: TOPUP_INCLUDE });
  if (!topUp) {
    throw new AppError('Wallet top-up not found', 404, 'NOT_FOUND');
  }
  return topUp;
}

// Info a driver needs before starting a top-up - the fixed preset amounts
// they can pick from, the single company-wide Bankily B-Pay merchant code
// every driver pays into (see appSetting.service.js#getMerchantCode - not
// per-driver, admin-editable via the Settings page), and their current
// balance (otherwise never shown anywhere in the driver app - see
// User.creditBalance).
async function getTopUpInfo(creditBalance) {
  const merchantCode = await getMerchantCode();
  return { presetAmounts: WALLET_TOPUP_PRESET_AMOUNTS, merchantCode, creditBalance };
}

// No gateway API for Bankily - the driver pays into the company's B-Pay
// merchant code via Bankily's own B-Pay feature, picking one of
// WALLET_TOPUP_PRESET_AMOUNTS. Only Bankily is supported for wallet top-ups
// now, so method is fixed rather than driver-chosen. confirmationCode is the
// code Bankily SMS's the driver once the B-Pay payment completes - proof the
// admin cross-checks against the company's own merchant SMS before
// confirming. This row itself IS the driver's declaration of that payment
// (driverDeclaredAt defaults to now on the model) - an admin still confirms
// via confirmTopUp before the balance is actually credited, same two-step
// shape as a settlement's declare/confirm.
async function createTopUp(driverId, { amount, confirmationCode }) {
  return prisma.walletTopUp.create({
    data: { driverId, amount, confirmationCode, method: 'BANKILY' },
    include: TOPUP_INCLUDE,
  });
}

async function listMyTopUps(driverId) {
  return prisma.walletTopUp.findMany({ where: { driverId }, include: TOPUP_INCLUDE, orderBy: { createdAt: 'desc' } });
}

async function listTopUps({ status, page, pageSize }) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 20;
  const where = { ...(status && { status }) };

  const [total, topUps] = await Promise.all([
    prisma.walletTopUp.count({ where }),
    prisma.walletTopUp.findMany({
      where,
      include: TOPUP_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
  ]);

  return { topUps, total, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) };
}

async function confirmTopUp(topUpId, adminUserId) {
  const topUp = await findTopUpOrThrow(topUpId);
  if (topUp.status !== 'PENDING') {
    throw new AppError('Only a pending top-up can be confirmed', 409, 'CONFLICT');
  }

  const [updated] = await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUpId },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedByUserId: adminUserId },
      include: TOPUP_INCLUDE,
    }),
    prisma.user.update({ where: { id: topUp.driverId }, data: { creditBalance: { increment: topUp.amount } } }),
  ]);

  sendPushToUser(topUp.driverId, {
    title: 'Recharge confirmée',
    body: 'Votre recharge de compte a été confirmée et ajoutée à votre solde.',
    data: { topUpId: updated.id, type: 'wallet:confirmed' },
  });

  return updated;
}

// Admin-initiated top-up, credited immediately with no driver declaration
// step - used when the driver can't do a normal mobile-money top-up
// themselves (e.g. their bank/mobile-money account is down). method
// 'COMPANY' distinguishes these from real Bankily/Sedad/Masrivi transfers
// in the top-ups list/reports.
async function createTopUpAsAdmin(driverId, amount, adminUserId) {
  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.role !== 'DRIVER') {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  const [topUp] = await prisma.$transaction([
    prisma.walletTopUp.create({
      data: {
        driverId,
        amount,
        method: 'COMPANY',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedByUserId: adminUserId,
      },
      include: TOPUP_INCLUDE,
    }),
    prisma.user.update({ where: { id: driverId }, data: { creditBalance: { increment: amount } } }),
  ]);

  sendPushToUser(driverId, {
    title: 'Recharge confirmée',
    body: 'Votre solde a été rechargé par l’administration.',
    data: { topUpId: topUp.id, type: 'wallet:confirmed' },
  });

  return topUp;
}

async function cancelTopUp(topUpId) {
  const topUp = await findTopUpOrThrow(topUpId);
  if (topUp.status !== 'PENDING') {
    throw new AppError('Only a pending top-up can be cancelled', 409, 'CONFLICT');
  }
  return prisma.walletTopUp.update({ where: { id: topUpId }, data: { status: 'CANCELLED' }, include: TOPUP_INCLUDE });
}

module.exports = {
  getTopUpInfo,
  createTopUp,
  createTopUpAsAdmin,
  listMyTopUps,
  listTopUps,
  confirmTopUp,
  cancelTopUp,
};
