const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const paymentService = require('../services/payment.service');
const rideService = require('../services/ride.service');

// Mounted directly in app.js (not under requireAuth/express.json) - Stripe
// calls this itself, verified by signature rather than a user's JWT, and
// needs the exact raw request body to check that signature.
const handleStripeWebhook = asyncHandler(async (req, res) => {
  const event = paymentService.constructWebhookEvent(req.body, req.headers['stripe-signature']);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const rideId = session.metadata?.rideId;
    if (rideId) {
      await rideService.markRidePaidFromStripe(rideId, session.payment_intent);
    }
  }

  sendSuccess(res, { data: { received: true } });
});

module.exports = { handleStripeWebhook };
