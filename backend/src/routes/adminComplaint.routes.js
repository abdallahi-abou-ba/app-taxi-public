const { Router } = require('express');
const controller = require('../controllers/adminComplaint.controller');
const validate = require('../middleware/validate.middleware');
const {
  complaintIdParamSchema,
  listComplaintsQuerySchema,
  updateComplaintSchema,
} = require('../validators/complaint.validators');

// Mounted under /api/admin/complaints by admin.routes.js, which already
// applies requireAuth + requireRole('ADMIN') + requirePermission('COMPLAINTS').
const router = Router();

router.get('/', validate(listComplaintsQuerySchema, 'query'), controller.listComplaints);
router.get('/:id', validate(complaintIdParamSchema, 'params'), controller.getComplaint);
router.patch(
  '/:id',
  validate(complaintIdParamSchema, 'params'),
  validate(updateComplaintSchema, 'body'),
  controller.updateComplaint
);

module.exports = router;
