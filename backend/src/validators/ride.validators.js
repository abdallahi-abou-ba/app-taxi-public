const { z } = require('zod');
const { SUPPORTED_MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');

// What a client may newly pick when requesting/scheduling a ride - CARD
// (Stripe), CLICK and BIMBANK are retired from selection (existing completed
// rides that used them remain untouched and still display fine); WALLET/
// COMPANY were never client-selectable inputs to begin with.
const REQUESTABLE_PAYMENT_METHODS = ['CASH', ...SUPPORTED_MOBILE_MONEY_METHODS];

const requestRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(1).optional(),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationAddress: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(REQUESTABLE_PAYMENT_METHODS).optional(),
});

const scheduleRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(1).optional(),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationAddress: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(REQUESTABLE_PAYMENT_METHODS).optional(),
  scheduledFor: z.string().datetime({ message: 'scheduledFor must be an ISO 8601 datetime' }),
});

const cancelRideSchema = z.object({
  reason: z.string().trim().min(1).optional(),
});

const rateRideSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5, 'Rating must be between 1 and 5'),
  comment: z.string().trim().max(500).optional(),
});

const rideIdParamSchema = z.object({
  id: z.string().uuid('Invalid ride id'),
});

// Query params always arrive as strings, so coerce to number before the
// same lat/lng bounds used at request time.
const estimateRideSchema = z.object({
  pickupLat: z.coerce.number().min(-90).max(90),
  pickupLng: z.coerce.number().min(-180).max(180),
  destinationLat: z.coerce.number().min(-90).max(90),
  destinationLng: z.coerce.number().min(-180).max(180),
});

// successUrl/cancelUrl come from the mobile client (see rideApi.js) since only
// it knows the right redirect for its current environment (Expo Go dev vs a
// standalone build).
const createCheckoutSessionSchema = z.object({
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

module.exports = {
  requestRideSchema,
  scheduleRideSchema,
  cancelRideSchema,
  rateRideSchema,
  rideIdParamSchema,
  createCheckoutSessionSchema,
  estimateRideSchema,
};
