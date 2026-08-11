const { Router } = require('express');
const realtimeController = require('../controllers/realtime.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.get('/token', requireAuth, realtimeController.createToken);

module.exports = router;
