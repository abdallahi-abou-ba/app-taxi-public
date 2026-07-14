const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const adminService = require('../services/admin.service');
const rideService = require('../services/ride.service');
const revenueService = require('../services/revenue.service');
const activityLogService = require('../services/activityLog.service');
const driverDocumentService = require('../services/driverDocument.service');
const appSettingService = require('../services/appSetting.service');

const listDrivers = asyncHandler(async (req, res) => {
  const drivers = await adminService.listDrivers(req.query.status);
  sendSuccess(res, { data: drivers });
});

const getDriverDetail = asyncHandler(async (req, res) => {
  const driver = await adminService.getDriverDetail(req.params.id);
  sendSuccess(res, { data: driver });
});

const createDriver = asyncHandler(async (req, res) => {
  const driver = await adminService.createDriver(req.body);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_CREATED',
    entityType: 'DRIVER',
    entityId: driver.id,
  });
  sendSuccess(res, { data: driver, status: 201 });
});

const updateDriver = asyncHandler(async (req, res) => {
  const driver = await adminService.updateDriver(req.params.id, req.body);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_UPDATED',
    entityType: 'DRIVER',
    entityId: driver.id,
    details: { fields: Object.keys(req.body) },
  });
  sendSuccess(res, { data: driver });
});

const approveDriver = asyncHandler(async (req, res) => {
  const driver = await adminService.setDriverApproval(req.params.id, 'APPROVED');
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_STATUS_CHANGED',
    entityType: 'DRIVER',
    entityId: driver.id,
    details: { status: 'APPROVED' },
  });
  sendSuccess(res, { data: driver });
});

const rejectDriver = asyncHandler(async (req, res) => {
  const driver = await adminService.setDriverApproval(req.params.id, 'REJECTED');
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_STATUS_CHANGED',
    entityType: 'DRIVER',
    entityId: driver.id,
    details: { status: 'REJECTED' },
  });
  sendSuccess(res, { data: driver });
});

const setDriverStatus = asyncHandler(async (req, res) => {
  const driver = await adminService.setDriverStatus(req.params.id, req.body.status);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_STATUS_CHANGED',
    entityType: 'DRIVER',
    entityId: driver.id,
    details: { status: req.body.status },
  });
  sendSuccess(res, { data: driver });
});

const archiveDriver = asyncHandler(async (req, res) => {
  await adminService.archiveDriver(req.params.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_ARCHIVED',
    entityType: 'DRIVER',
    entityId: req.params.id,
  });
  sendSuccess(res, { data: { id: req.params.id } });
});

const setCommissionRate = asyncHandler(async (req, res) => {
  const driver = await adminService.setCommissionRate(req.params.id, req.user.id, req.body.newRate, req.body.reason);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'DRIVER_COMMISSION_RATE_CHANGED',
    entityType: 'DRIVER',
    entityId: driver.id,
    details: { newRate: req.body.newRate, reason: req.body.reason },
  });
  sendSuccess(res, { data: driver });
});

const getCommissionHistory = asyncHandler(async (req, res) => {
  const history = await adminService.getCommissionHistory(req.params.id);
  sendSuccess(res, { data: history });
});

const getSettings = asyncHandler(async (req, res) => {
  const [defaultCommissionRate, walletTopupMerchantCode] = await Promise.all([
    appSettingService.getDefaultCommissionRate(),
    appSettingService.getWalletTopupMerchantCode(),
  ]);
  sendSuccess(res, { data: { defaultCommissionRate, walletTopupMerchantCode } });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { defaultCommissionRate, walletTopupMerchantCode } = req.body;

  if (defaultCommissionRate !== undefined) {
    const oldValue = await appSettingService.getDefaultCommissionRate();
    await appSettingService.setDefaultCommissionRate(defaultCommissionRate, req.user.id);
    await activityLogService.logActivity({
      adminUserId: req.user.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'APP_SETTING',
      entityId: 'DEFAULT_COMMISSION_RATE',
      details: { oldValue, newValue: defaultCommissionRate },
    });
  }

  if (walletTopupMerchantCode !== undefined) {
    const oldValue = await appSettingService.getWalletTopupMerchantCode();
    await appSettingService.setWalletTopupMerchantCode(walletTopupMerchantCode, req.user.id);
    await activityLogService.logActivity({
      adminUserId: req.user.id,
      action: 'SETTINGS_UPDATED',
      entityType: 'APP_SETTING',
      entityId: 'WALLET_TOPUP_MERCHANT_CODE',
      details: { oldValue, newValue: walletTopupMerchantCode },
    });
  }

  const [updatedRate, updatedCode] = await Promise.all([
    appSettingService.getDefaultCommissionRate(),
    appSettingService.getWalletTopupMerchantCode(),
  ]);
  sendSuccess(res, { data: { defaultCommissionRate: updatedRate, walletTopupMerchantCode: updatedCode } });
});

const getDriverDocumentFile = asyncHandler(async (req, res) => {
  const doc = await driverDocumentService.getDocumentFile(req.params.id, req.params.type);
  res.set('Content-Type', doc.mimeType);
  // Prisma returns a Bytes column as a plain Uint8Array, not a real Node
  // Buffer - res.send() only streams raw bytes for Buffer.isBuffer(), and
  // silently JSON-serializes anything else (e.g. `{"0":137,"1":80,...}`).
  res.send(Buffer.from(doc.data));
});

const listClients = asyncHandler(async (req, res) => {
  const clients = await adminService.listClients();
  sendSuccess(res, { data: clients });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getGlobalStats();
  sendSuccess(res, { data: stats });
});

const listRides = asyncHandler(async (req, res) => {
  const { page, pageSize, ...filters } = req.query;
  const result = await rideService.adminListRides({ ...filters, page, pageSize });
  sendSuccess(res, {
    data: result.rides,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
});

const getRide = asyncHandler(async (req, res) => {
  const ride = await rideService.adminGetRideById(req.params.id);
  sendSuccess(res, { data: ride });
});

const getRevenue = asyncHandler(async (req, res) => {
  const revenue = await revenueService.getRevenueAggregate(req.query);
  sendSuccess(res, { data: revenue });
});

const getActivityLog = asyncHandler(async (req, res) => {
  const { page, pageSize, ...filters } = req.query;
  const result = await activityLogService.listActivityLog({ ...filters, page, pageSize });
  sendSuccess(res, {
    data: result.logs,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
});

module.exports = {
  listDrivers,
  getDriverDetail,
  createDriver,
  updateDriver,
  approveDriver,
  rejectDriver,
  setDriverStatus,
  archiveDriver,
  setCommissionRate,
  getCommissionHistory,
  getSettings,
  updateSettings,
  getDriverDocumentFile,
  listClients,
  getStats,
  listRides,
  getRide,
  getRevenue,
  getActivityLog,
};
