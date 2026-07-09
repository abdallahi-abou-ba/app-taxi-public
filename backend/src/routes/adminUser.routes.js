const { Router } = require('express');
const controller = require('../controllers/adminUser.controller');
const validate = require('../middleware/validate.middleware');
const { adminIdParamSchema, createAdminUserSchema, updateAdminRoleSchema } = require('../validators/adminUser.validators');
const { requirePermission } = require('../middleware/auth.middleware');

// Mounted under /api/admin/admins by admin.routes.js, which already applies
// requireAuth + requireRole('ADMIN'). 'ADMINS' isn't granted to any
// AdminRole in ADMIN_ROLE_PERMISSIONS, so only SUPER_ADMIN passes here.
const router = Router();
router.use(requirePermission('ADMINS'));

router.get('/', controller.listAdmins);
router.post('/', validate(createAdminUserSchema, 'body'), controller.createAdminUser);
router.patch(
  '/:id/role',
  validate(adminIdParamSchema, 'params'),
  validate(updateAdminRoleSchema, 'body'),
  controller.updateAdminRole
);

module.exports = router;
