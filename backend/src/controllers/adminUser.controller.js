const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const adminUserService = require('../services/adminUser.service');
const activityLogService = require('../services/activityLog.service');

const listAdmins = asyncHandler(async (req, res) => {
  const admins = await adminUserService.listAdmins();
  sendSuccess(res, { data: admins });
});

const createAdminUser = asyncHandler(async (req, res) => {
  const admin = await adminUserService.createAdminUser(req.body);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'ADMIN_CREATED',
    entityType: 'ADMIN',
    entityId: admin.id,
    details: { adminRole: admin.adminRole },
  });
  sendSuccess(res, { data: admin, status: 201 });
});

const updateAdminRole = asyncHandler(async (req, res) => {
  const admin = await adminUserService.updateAdminRole(req.params.id, req.body.adminRole, req.user.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'ADMIN_ROLE_CHANGED',
    entityType: 'ADMIN',
    entityId: admin.id,
    details: { newRole: admin.adminRole },
  });
  sendSuccess(res, { data: admin });
});

module.exports = { listAdmins, createAdminUser, updateAdminRole };
