const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const vehicleRoutes = require('./vehicle.routes');
const adminUserRoutes = require('./adminUser.routes');
const expenseRoutes = require('./expense.routes');
const settlementRoutes = require('./settlement.routes');
const adminComplaintRoutes = require('./adminComplaint.routes');
const reportRoutes = require('./report.routes');
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
  activityLogQuerySchema,
} = require('../validators/admin.validators');
const { rideIdParamSchema } = require('../validators/ride.validators');
const { requireAuth, requireRole, requirePermission } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get(
  '/drivers',
  requirePermission('DRIVERS'),
  validate(listDriversQuerySchema, 'query'),
  adminController.listDrivers
);
router.post('/drivers', requirePermission('DRIVERS'), validate(createDriverSchema, 'body'), adminController.createDriver);
router.get(
  '/drivers/:id',
  requirePermission('DRIVERS'),
  validate(driverIdParamSchema, 'params'),
  adminController.getDriverDetail
);
router.patch(
  '/drivers/:id',
  requirePermission('DRIVERS'),
  validate(driverIdParamSchema, 'params'),
  validate(updateDriverSchema, 'body'),
  adminController.updateDriver
);
router.delete(
  '/drivers/:id',
  requirePermission('DRIVERS'),
  validate(driverIdParamSchema, 'params'),
  adminController.archiveDriver
);
router.patch(
  '/drivers/:id/approve',
  requirePermission('DRIVERS'),
  validate(driverIdParamSchema, 'params'),
  adminController.approveDriver
);
router.patch(
  '/drivers/:id/reject',
  requirePermission('DRIVERS'),
  validate(driverIdParamSchema, 'params'),
  adminController.rejectDriver
);
router.patch(
  '/drivers/:id/status',
  requirePermission('DRIVERS'),
  validate(driverIdParamSchema, 'params'),
  validate(driverStatusBodySchema, 'body'),
  adminController.setDriverStatus
);
// Commission changes are financial - reachable by DRIVERS (day-to-day
// operations) or REVENUE (Comptable's remit per spec 3.3), unlike the rest
// of the /drivers subtree.
router.patch(
  '/drivers/:id/commission-rate',
  requirePermission('DRIVERS', 'REVENUE'),
  validate(driverIdParamSchema, 'params'),
  validate(commissionRateBodySchema, 'body'),
  adminController.setCommissionRate
);
router.get(
  '/drivers/:id/commission-history',
  requirePermission('DRIVERS', 'REVENUE'),
  validate(driverIdParamSchema, 'params'),
  adminController.getCommissionHistory
);

router.get('/clients', requirePermission('CLIENTS'), adminController.listClients);
router.get('/stats', adminController.getStats);

router.get('/rides', requirePermission('RIDES'), validate(adminListRidesQuerySchema, 'query'), adminController.listRides);
router.get('/rides/:id', requirePermission('RIDES'), validate(rideIdParamSchema, 'params'), adminController.getRide);

router.get('/revenue', requirePermission('REVENUE'), validate(revenueQuerySchema, 'query'), adminController.getRevenue);

router.get(
  '/activity-log',
  requirePermission('ACTIVITY_LOG'),
  validate(activityLogQuerySchema, 'query'),
  adminController.getActivityLog
);

router.use('/vehicles', requirePermission('VEHICLES'), vehicleRoutes);
router.use('/admins', adminUserRoutes);
router.use('/expenses', requirePermission('EXPENSES'), expenseRoutes);
router.use('/settlements', requirePermission('SETTLEMENTS'), settlementRoutes);
router.use('/complaints', requirePermission('COMPLAINTS'), adminComplaintRoutes);
router.use('/reports', requirePermission('REPORTS'), reportRoutes);

module.exports = router;
