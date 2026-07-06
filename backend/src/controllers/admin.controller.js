const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const adminService = require('../services/admin.service');

const listDrivers = asyncHandler(async (req, res) => {
  const drivers = await adminService.listDrivers(req.query.status);
  sendSuccess(res, { data: drivers });
});

const approveDriver = asyncHandler(async (req, res) => {
  const driver = await adminService.setDriverApproval(req.params.id, 'APPROVED');
  sendSuccess(res, { data: driver });
});

const rejectDriver = asyncHandler(async (req, res) => {
  const driver = await adminService.setDriverApproval(req.params.id, 'REJECTED');
  sendSuccess(res, { data: driver });
});

const listClients = asyncHandler(async (req, res) => {
  const clients = await adminService.listClients();
  sendSuccess(res, { data: clients });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getGlobalStats();
  sendSuccess(res, { data: stats });
});

module.exports = { listDrivers, approveDriver, rejectDriver, listClients, getStats };
