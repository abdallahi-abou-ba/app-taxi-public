const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const walletService = require('../services/wallet.service');
const activityLogService = require('../services/activityLog.service');

const listTopUps = asyncHandler(async (req, res) => {
  const result = await walletService.listTopUps(req.query);
  sendSuccess(res, {
    data: result.topUps,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
});

const confirmTopUp = asyncHandler(async (req, res) => {
  const topUp = await walletService.confirmTopUp(req.params.id, req.user.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'WALLET_TOPUP_CONFIRMED',
    entityType: 'WALLET_TOPUP',
    entityId: topUp.id,
    details: { clientId: topUp.clientId, amount: topUp.amount, method: topUp.method },
  });
  sendSuccess(res, { data: topUp });
});

const cancelTopUp = asyncHandler(async (req, res) => {
  const topUp = await walletService.cancelTopUp(req.params.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'WALLET_TOPUP_CANCELLED',
    entityType: 'WALLET_TOPUP',
    entityId: topUp.id,
  });
  sendSuccess(res, { data: topUp });
});

module.exports = { listTopUps, confirmTopUp, cancelTopUp };
