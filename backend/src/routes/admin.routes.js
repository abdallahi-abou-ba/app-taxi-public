const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const vehicleRoutes = require('./vehicle.routes');
const validate = require('../middleware/validate.middleware');
const {
  driverIdParamSchema,
  listDriversQuerySchema,
  createDriverSchema,
  updateDriverSchema,
  driverStatusBodySchema,
  commissionRateBodySchema,
  adminListRidesQuerySchema,
  revenueQuerySchema,
} = require('../validators/admin.validators');
const { rideIdParamSchema } = require('../validators/ride.validators');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/drivers', validate(listDriversQuerySchema, 'query'), adminController.listDrivers);
router.post('/drivers', validate(createDriverSchema, 'body'), adminController.createDriver);
router.get('/drivers/:id', validate(driverIdParamSchema, 'params'), adminController.getDriverDetail);
router.patch(
  '/drivers/:id',
  validate(driverIdParamSchema, 'params'),
  validate(updateDriverSchema, 'body'),
  adminController.updateDriver
);
router.delete('/drivers/:id', validate(driverIdParamSchema, 'params'), adminController.archiveDriver);
router.patch('/drivers/:id/approve', validate(driverIdParamSchema, 'params'), adminController.approveDriver);
router.patch('/drivers/:id/reject', validate(driverIdParamSchema, 'params'), adminController.rejectDriver);
router.patch(
  '/drivers/:id/status',
  validate(driverIdParamSchema, 'params'),
  validate(driverStatusBodySchema, 'body'),
  adminController.setDriverStatus
);
router.patch(
  '/drivers/:id/commission-rate',
  validate(driverIdParamSchema, 'params'),
  validate(commissionRateBodySchema, 'body'),
  adminController.setCommissionRate
);
router.get(
  '/drivers/:id/commission-history',
  validate(driverIdParamSchema, 'params'),
  adminController.getCommissionHistory
);

router.get('/clients', adminController.listClients);
router.get('/stats', adminController.getStats);

router.get('/rides', validate(adminListRidesQuerySchema, 'query'), adminController.listRides);
router.get('/rides/:id', validate(rideIdParamSchema, 'params'), adminController.getRide);

router.get('/revenue', validate(revenueQuerySchema, 'query'), adminController.getRevenue);

router.use('/vehicles', vehicleRoutes);

module.exports = router;
