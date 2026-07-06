const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const validate = require('../middleware/validate.middleware');
const { driverIdParamSchema, listDriversQuerySchema } = require('../validators/admin.validators');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/drivers', validate(listDriversQuerySchema, 'query'), adminController.listDrivers);
router.patch('/drivers/:id/approve', validate(driverIdParamSchema, 'params'), adminController.approveDriver);
router.patch('/drivers/:id/reject', validate(driverIdParamSchema, 'params'), adminController.rejectDriver);
router.get('/clients', adminController.listClients);
router.get('/stats', adminController.getStats);

module.exports = router;
