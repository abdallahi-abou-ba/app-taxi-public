const { Router } = require('express');
const controller = require('../controllers/complaint.controller');
const validate = require('../middleware/validate.middleware');
const { submitComplaintSchema } = require('../validators/complaint.validators');
const { requireAuth } = require('../middleware/auth.middleware');

// Mounted at /api/complaints (routes/index.js) - any authenticated CLIENT or
// DRIVER can submit one about a ride or another user. Admin-side listing and
// resolution lives separately in adminComplaint.routes.js, under
// /api/admin/complaints (requires the ADMIN role + COMPLAINTS permission).
const router = Router();

router.post('/', requireAuth, validate(submitComplaintSchema, 'body'), controller.submitComplaint);

module.exports = router;
