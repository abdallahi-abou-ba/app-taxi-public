const { Router } = require('express');
const locationController = require('../controllers/location.controller');
const validate = require('../middleware/validate.middleware');
const { updateLocationSchema } = require('../validators/location.validators');
const { requireAuth } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

// Replaces the old Socket.io 'location:update' emit (see lib/realtime.js) -
// location pings are a plain REST call now that the backend has no
// persistent connection to receive them on. Either role can post their own
// position - the controller branches on req.user.role to relay it to the
// other side of that user's active ride.
router.post('/', validate(updateLocationSchema), locationController.updateLocation);

module.exports = router;
