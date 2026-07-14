const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const env = require('../config/env');

const DEFAULT_COMMISSION_RATE_KEY = 'DEFAULT_COMMISSION_RATE';
const WALLET_TOPUP_MERCHANT_CODE_KEY = 'WALLET_TOPUP_MERCHANT_CODE';

// Falls back to env.DEFAULT_COMMISSION_RATE when no admin override has been
// saved yet, so every existing read site keeps working unmigrated.
async function getDefaultCommissionRate() {
  const row = await prisma.appSetting.findUnique({ where: { key: DEFAULT_COMMISSION_RATE_KEY } });
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : env.DEFAULT_COMMISSION_RATE;
}

async function setDefaultCommissionRate(newRate, adminUserId) {
  if (typeof newRate !== 'number' || Number.isNaN(newRate) || newRate < 0 || newRate > 1) {
    throw new AppError('newRate must be a number between 0 and 1', 422, 'VALIDATION_ERROR');
  }

  return prisma.appSetting.upsert({
    where: { key: DEFAULT_COMMISSION_RATE_KEY },
    create: { key: DEFAULT_COMMISSION_RATE_KEY, value: String(newRate), updatedByUserId: adminUserId },
    update: { value: String(newRate), updatedByUserId: adminUserId },
  });
}

// The company's mobile-money merchant code, shown to a driver doing a wallet
// top-up (see wallet.service.js) so they can pay it via their mobile-money
// app's own "pay a merchant" feature - null until an admin sets one from
// Settings, since there's no sane hardcoded default for a real merchant code.
async function getWalletTopupMerchantCode() {
  const row = await prisma.appSetting.findUnique({ where: { key: WALLET_TOPUP_MERCHANT_CODE_KEY } });
  return row ? row.value : null;
}

async function setWalletTopupMerchantCode(code, adminUserId) {
  return prisma.appSetting.upsert({
    where: { key: WALLET_TOPUP_MERCHANT_CODE_KEY },
    create: { key: WALLET_TOPUP_MERCHANT_CODE_KEY, value: code, updatedByUserId: adminUserId },
    update: { value: code, updatedByUserId: adminUserId },
  });
}

module.exports = {
  getDefaultCommissionRate,
  setDefaultCommissionRate,
  getWalletTopupMerchantCode,
  setWalletTopupMerchantCode,
};
