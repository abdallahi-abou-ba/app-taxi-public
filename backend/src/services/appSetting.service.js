const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const env = require('../config/env');

const DEFAULT_COMMISSION_RATE_KEY = 'DEFAULT_COMMISSION_RATE';
const MIN_BALANCE_TO_GO_ONLINE_KEY = 'MIN_BALANCE_TO_GO_ONLINE';

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

// Falls back to env.MIN_BALANCE_TO_GO_ONLINE when no admin override has been
// saved yet, mirroring getDefaultCommissionRate above.
async function getMinBalanceToGoOnline() {
  const row = await prisma.appSetting.findUnique({ where: { key: MIN_BALANCE_TO_GO_ONLINE_KEY } });
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : env.MIN_BALANCE_TO_GO_ONLINE;
}

async function setMinBalanceToGoOnline(newAmount, adminUserId) {
  if (typeof newAmount !== 'number' || Number.isNaN(newAmount) || newAmount < 0) {
    throw new AppError('newAmount must be a non-negative number', 422, 'VALIDATION_ERROR');
  }

  return prisma.appSetting.upsert({
    where: { key: MIN_BALANCE_TO_GO_ONLINE_KEY },
    create: { key: MIN_BALANCE_TO_GO_ONLINE_KEY, value: String(newAmount), updatedByUserId: adminUserId },
    update: { value: String(newAmount), updatedByUserId: adminUserId },
  });
}

module.exports = {
  getDefaultCommissionRate,
  setDefaultCommissionRate,
  getMinBalanceToGoOnline,
  setMinBalanceToGoOnline,
};
