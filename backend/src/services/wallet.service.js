const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const env = require('../config/env');
const paymentService = require('./payment.service');
const appSettingService = require('./appSetting.service');
const { MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');
const { sendPushToUser } = require('../utils/push.util');

const TOPUP_INCLUDE = {
  client: { select: { id: true, fullName: true, phone: true } },
  confirmedByUser: { select: { id: true, fullName: true } },
};

async function findTopUpOrThrow(topUpId) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId }, include: TOPUP_INCLUDE });
  if (!topUp) {
    throw new AppError('Wallet top-up not found', 404, 'NOT_FOUND');
  }
  return topUp;
}

// Info a client needs before starting a top-up - minimum amount and, for
// mobile-money methods, the company's own receiving number (null until an
// admin sets one from Settings; see appSetting.service.js).
async function getTopUpInfo() {
  const companyPhone = await appSettingService.getWalletTopupPhone();
  return { minAmount: env.WALLET_TOPUP_MIN_AMOUNT, companyPhone };
}

// CARD goes through Stripe Checkout (confirmed automatically by the webhook -
// see markTopUpPaidFromStripe below - never by an admin). Mobile-money
// methods have no gateway API, so the client transfers to the company's own
// number outside the app and this row itself IS the declaration
// (clientDeclaredAt set immediately) - unlike Settlement's declare/confirm,
// there's no pre-existing admin-created row to declare against here. Either
// way an admin still confirms mobile-money top-ups via confirmTopUp before
// the balance is actually credited.
async function createTopUp(clientId, { amount, method, successUrl, cancelUrl }) {
  if (amount < env.WALLET_TOPUP_MIN_AMOUNT) {
    throw new AppError(`The minimum top-up amount is ${env.WALLET_TOPUP_MIN_AMOUNT}`, 422, 'VALIDATION_ERROR');
  }

  if (method === 'CARD') {
    if (!successUrl || !cancelUrl) {
      throw new AppError('successUrl and cancelUrl are required for a card top-up', 422, 'VALIDATION_ERROR');
    }
    const topUp = await prisma.walletTopUp.create({ data: { clientId, amount, method }, include: TOPUP_INCLUDE });
    const session = await paymentService.createTopUpCheckoutSession(topUp, { successUrl, cancelUrl });
    const updated = await prisma.walletTopUp.update({
      where: { id: topUp.id },
      data: { stripeCheckoutSessionId: session.id },
      include: TOPUP_INCLUDE,
    });
    return { topUp: updated, url: session.url };
  }

  if (!MOBILE_MONEY_METHODS.includes(method)) {
    throw new AppError('Unsupported top-up method', 422, 'VALIDATION_ERROR');
  }

  const topUp = await prisma.walletTopUp.create({
    data: { clientId, amount, method, clientDeclaredAt: new Date() },
    include: TOPUP_INCLUDE,
  });
  return { topUp };
}

async function listMyTopUps(clientId) {
  return prisma.walletTopUp.findMany({ where: { clientId }, include: TOPUP_INCLUDE, orderBy: { createdAt: 'desc' } });
}

// Idempotent - Stripe may redeliver the same webhook event more than once, so
// a top-up that's already confirmed (or no longer exists) is silently a no-op.
async function markTopUpPaidFromStripe(topUpId, paymentIntentId) {
  const topUp = await prisma.walletTopUp.findUnique({ where: { id: topUpId } });
  if (!topUp || topUp.status !== 'PENDING') return;

  await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUpId },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), stripePaymentIntentId: paymentIntentId },
    }),
    prisma.user.update({ where: { id: topUp.clientId }, data: { creditBalance: { increment: topUp.amount } } }),
  ]);
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

// Mobile-money confirm only - a CARD top-up can only ever be confirmed by the
// Stripe webhook, so an admin trying to push one to CONFIRMED by hand would
// credit a balance with no actual payment behind it.
async function confirmTopUp(topUpId, adminUserId) {
  const topUp = await findTopUpOrThrow(topUpId);
  if (topUp.method === 'CARD') {
    throw new AppError('Card top-ups are confirmed automatically once payment completes', 409, 'CONFLICT');
  }
  if (topUp.status !== 'PENDING') {
    throw new AppError('Only a pending top-up can be confirmed', 409, 'CONFLICT');
  }

  const [updated] = await prisma.$transaction([
    prisma.walletTopUp.update({
      where: { id: topUpId },
      data: { status: 'CONFIRMED', confirmedAt: new Date(), confirmedByUserId: adminUserId },
      include: TOPUP_INCLUDE,
    }),
    prisma.user.update({ where: { id: topUp.clientId }, data: { creditBalance: { increment: topUp.amount } } }),
  ]);

  sendPushToUser(topUp.clientId, {
    title: 'Recharge confirmée',
    body: 'Votre recharge de compte a été confirmée et ajoutée à votre solde.',
    data: { topUpId: updated.id, type: 'wallet:confirmed' },
  });

  return updated;
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
  listMyTopUps,
  markTopUpPaidFromStripe,
  listTopUps,
  confirmTopUp,
  cancelTopUp,
};
