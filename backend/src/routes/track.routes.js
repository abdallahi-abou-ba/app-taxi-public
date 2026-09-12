const { Router } = require('express');
const trackController = require('../controllers/track.controller');
const validate = require('../middleware/validate.middleware');
const { trackTokenParamSchema } = require('../validators/track.validators');
const { shareViewRateLimiter } = require('../middleware/rateLimit.middleware');

// Public, unauthenticated - polled every 5s by the /track/:token page (see
// app.js) served outside this /api-mounted router. No requireAuth here.
const router = Router();

router.use(shareViewRateLimiter);

router.get('/:token', validate(trackTokenParamSchema, 'params'), trackController.getTrackingData);

module.exports = router;
