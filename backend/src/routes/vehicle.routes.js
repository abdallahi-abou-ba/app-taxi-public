const { Router } = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const validate = require('../middleware/validate.middleware');
const {
  vehicleIdParamSchema,
  listVehiclesQuerySchema,
  createVehicleSchema,
  updateVehicleSchema,
  assignVehicleSchema,
} = require('../validators/vehicle.validators');

// Mounted under /api/admin/vehicles by admin.routes.js, which already applies
// requireAuth + requireRole('ADMIN') - no separate auth wiring needed here.
const router = Router();

router.get('/', validate(listVehiclesQuerySchema, 'query'), vehicleController.listVehicles);
router.post('/', validate(createVehicleSchema, 'body'), vehicleController.createVehicle);
router.get('/:id', validate(vehicleIdParamSchema, 'params'), vehicleController.getVehicle);
router.patch(
  '/:id',
  validate(vehicleIdParamSchema, 'params'),
  validate(updateVehicleSchema, 'body'),
  vehicleController.updateVehicle
);
router.delete('/:id', validate(vehicleIdParamSchema, 'params'), vehicleController.archiveVehicle);
router.patch(
  '/:id/assign',
  validate(vehicleIdParamSchema, 'params'),
  validate(assignVehicleSchema, 'body'),
  vehicleController.assignVehicle
);
router.patch('/:id/unassign', validate(vehicleIdParamSchema, 'params'), vehicleController.unassignVehicle);

module.exports = router;
