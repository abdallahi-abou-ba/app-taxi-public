const { Router } = require('express');
const controller = require('../controllers/walletTopup.controller');
const validate = require('../middleware/validate.middleware');
const { topUpIdParamSchema, listTopUpsQuerySchema } = require('../validators/wallet.validators');

// Mounted under /api/admin/wallet-topups by admin.routes.js, which already
// applies requireAuth + requireRole('ADMIN') + requirePermission('WALLET_TOPUPS').
const router = Router();

router.get('/', validate(listTopUpsQuerySchema, 'query'), controller.listTopUps);
router.patch('/:id/confirm', validate(topUpIdParamSchema, 'params'), controller.confirmTopUp);
router.patch('/:id/cancel', validate(topUpIdParamSchema, 'params'), controller.cancelTopUp);

module.exports = router;
