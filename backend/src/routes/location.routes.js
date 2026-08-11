const { Router } = require('express');
const locationController = require('../controllers/location.controller');
const validate = require('../middleware/validate.middleware');
const { updateLocationSchema } = require('../validators/location.validators');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

// Replaces the old Socket.io 'location:update' emit (see lib/realtime.js) -
// driver location pings are a plain REST call now that the backend has no
// persistent connection to receive them on.
router.post('/', requireRole('DRIVER'), validate(updateLocationSchema), locationController.updateLocation);

module.exports = router;
