const Stripe = require('stripe');
const env = require('../config/env');
const AppError = require('../utils/appError');

let stripeClient = null;

function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError('Online payment is not configured on this server', 503, 'PAYMENT_NOT_CONFIGURED');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// successUrl/cancelUrl are supplied by the mobile client (see rideApi.js)
// rather than built from a fixed scheme here, since only the client knows
// the right redirect for its current environment - a raw exp://<lan-ip>:8081
// link in Expo Go dev, or the app's own custom scheme in a standalone build.
async function createCheckoutSession(ride, { successUrl, cancelUrl }) {
  const stripe = getStripeClient();
  const amountDue = Math.max(0, (ride.estimatedFare || 0) - (ride.creditApplied || 0));
  if (amountDue <= 0) {
    throw new AppError('There is nothing left to pay for this ride', 409, 'CONFLICT');
  }

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: Math.round(amountDue * 100),
          product_data: { name: `Ride #${ride.id.slice(0, 8)}` },
        },
        quantity: 1,
      },
    ],
    metadata: { rideId: ride.id },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

// Same Checkout Session shape as createCheckoutSession above, but for a
// client topping up their own creditBalance rather than paying for a ride -
// metadata carries a topUpId instead of a rideId so the webhook (see
// payment.controller.js) can tell the two apart.
async function createTopUpCheckoutSession(topUp, { successUrl, cancelUrl }) {
  const stripe = getStripeClient();

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: env.STRIPE_CURRENCY,
          unit_amount: Math.round(topUp.amount * 100),
          product_data: { name: 'Recharge de compte' },
        },
        quantity: 1,
      },
    ],
    metadata: { topUpId: topUp.id },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripeClient();
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new AppError('Stripe webhook secret is not configured', 503, 'PAYMENT_NOT_CONFIGURED');
  }
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw new AppError(`Invalid Stripe webhook signature: ${err.message}`, 400, 'INVALID_SIGNATURE');
  }
}

module.exports = { createCheckoutSession, createTopUpCheckoutSession, constructWebhookEvent };
