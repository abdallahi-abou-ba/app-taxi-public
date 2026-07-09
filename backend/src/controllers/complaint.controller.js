const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const complaintService = require('../services/complaint.service');

const submitComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.submitComplaint(req.user.id, req.body);
  sendSuccess(res, { data: complaint, status: 201 });
});

module.exports = { submitComplaint };
