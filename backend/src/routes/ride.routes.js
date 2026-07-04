const { Router } = require('express');
const rideController = require('../controllers/ride.controller');
const messageController = require('../controllers/message.controller');
const validate = require('../middleware/validate.middleware');
const { requestRideSchema, scheduleRideSchema, cancelRideSchema, rateRideSchema, rideIdParamSchema } = require('../validators/ride.validators');
const { sendMessageSchema } = require('../validators/message.validators');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = Router();

router.use(requireAuth);

router.post('/', requireRole('CLIENT'), validate(requestRideSchema), rideController.requestRide);
router.get('/', rideController.listRides);
router.get('/active', rideController.getActiveRide);
router.get('/stats', rideController.getStats);
router.post('/scheduled', requireRole('CLIENT'), validate(scheduleRideSchema), rideController.scheduleRide);
router.get('/scheduled', rideController.listScheduledRides);
router.get('/:id', validate(rideIdParamSchema, 'params'), rideController.getRide);
router.patch('/:id/accept', requireRole('DRIVER'), validate(rideIdParamSchema, 'params'), rideController.acceptRide);
router.patch('/:id/arrive', requireRole('DRIVER'), validate(rideIdParamSchema, 'params'), rideController.arriveRide);
router.patch('/:id/start', requireRole('DRIVER'), validate(rideIdParamSchema, 'params'), rideController.startRide);
router.patch('/:id/complete', requireRole('DRIVER'), validate(rideIdParamSchema, 'params'), rideController.completeRide);
router.patch(
  '/:id/cancel',
  validate(rideIdParamSchema, 'params'),
  validate(cancelRideSchema),
  rideController.cancelRide
);
router.post(
  '/:id/rate',
  validate(rideIdParamSchema, 'params'),
  validate(rateRideSchema),
  rideController.rateRide
);
router.patch(
  '/:id/mark-paid',
  requireRole('DRIVER'),
  validate(rideIdParamSchema, 'params'),
  rideController.markRidePaid
);
router.delete(
  '/:id/history',
  validate(rideIdParamSchema, 'params'),
  rideController.hideFromHistory
);
router.get(
  '/:id/messages',
  validate(rideIdParamSchema, 'params'),
  messageController.listMessages
);
router.post(
  '/:id/messages',
  validate(rideIdParamSchema, 'params'),
  validate(sendMessageSchema),
  messageController.sendMessage
);

module.exports = router;
