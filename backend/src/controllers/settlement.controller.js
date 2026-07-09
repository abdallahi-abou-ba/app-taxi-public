const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const settlementService = require('../services/settlement.service');
const activityLogService = require('../services/activityLog.service');

const listSettlements = asyncHandler(async (req, res) => {
  const { page, pageSize, ...filters } = req.query;
  const result = await settlementService.listSettlements({ ...filters, page, pageSize });
  sendSuccess(res, {
    data: result.settlements,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
});

const getSettlement = asyncHandler(async (req, res) => {
  const settlement = await settlementService.getSettlementById(req.params.id);
  sendSuccess(res, { data: settlement });
});

const generateSettlement = asyncHandler(async (req, res) => {
  const settlement = await settlementService.generateSettlement(req.body, req.user.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'SETTLEMENT_GENERATED',
    entityType: 'SETTLEMENT',
    entityId: settlement.id,
    details: { driverId: settlement.driverId, netAmount: settlement.netAmount },
  });
  sendSuccess(res, { data: settlement, status: 201 });
});

const markSettlementPaid = asyncHandler(async (req, res) => {
  const settlement = await settlementService.markSettlementPaid(req.params.id, req.user.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'SETTLEMENT_PAID',
    entityType: 'SETTLEMENT',
    entityId: settlement.id,
  });
  sendSuccess(res, { data: settlement });
});

const cancelSettlement = asyncHandler(async (req, res) => {
  const settlement = await settlementService.cancelSettlement(req.params.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'SETTLEMENT_CANCELLED',
    entityType: 'SETTLEMENT',
    entityId: settlement.id,
  });
  sendSuccess(res, { data: settlement });
});

module.exports = { listSettlements, getSettlement, generateSettlement, markSettlementPaid, cancelSettlement };
