const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const complaintService = require('../services/complaint.service');
const activityLogService = require('../services/activityLog.service');

const listComplaints = asyncHandler(async (req, res) => {
  const { page, pageSize, ...filters } = req.query;
  const result = await complaintService.listComplaints({ ...filters, page, pageSize });
  sendSuccess(res, {
    data: result.complaints,
    meta: { page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages },
  });
});

const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintById(req.params.id);
  sendSuccess(res, { data: complaint });
});

const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.updateComplaint(req.params.id, req.body, req.user.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'COMPLAINT_UPDATED',
    entityType: 'COMPLAINT',
    entityId: complaint.id,
    details: req.body,
  });
  sendSuccess(res, { data: complaint });
});

module.exports = { listComplaints, getComplaint, updateComplaint };
