const { Router } = require('express');
const controller = require('../controllers/settlement.controller');
const validate = require('../middleware/validate.middleware');
const {
  settlementIdParamSchema,
  listSettlementsQuerySchema,
  createSettlementSchema,
} = require('../validators/settlement.validators');

// Mounted under /api/admin/settlements by admin.routes.js, which already
// applies requireAuth + requireRole('ADMIN') + requirePermission('FINANCE').
const router = Router();

router.get('/', validate(listSettlementsQuerySchema, 'query'), controller.listSettlements);
router.post('/', validate(createSettlementSchema, 'body'), controller.generateSettlement);
router.get('/:id', validate(settlementIdParamSchema, 'params'), controller.getSettlement);
router.patch('/:id/pay', validate(settlementIdParamSchema, 'params'), controller.markSettlementPaid);
router.patch('/:id/cancel', validate(settlementIdParamSchema, 'params'), controller.cancelSettlement);

module.exports = router;
