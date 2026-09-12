const { z } = require('zod');
const { SUPPORTED_MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');

// What a client may newly pick when requesting/scheduling a ride - CARD
// (Stripe), CLICK and BIMBANK are retired from selection (existing completed
// rides that used them remain untouched and still display fine); WALLET/
// COMPANY were never client-selectable inputs to begin with.
const REQUESTABLE_PAYMENT_METHODS = ['CASH', ...SUPPORTED_MOBILE_MONEY_METHODS];

// Kept small deliberately - each stop costs an extra OSRM waypoint and,
// later, two more Nominatim reverse-geocode calls in the background
// enrichment pass (see ride.service.js#doEnrichRideAddressesInArabic).
const MAX_STOPS = 3;

const stopSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const requestRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(1).optional(),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationAddress: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(REQUESTABLE_PAYMENT_METHODS).optional(),
  stops: z.array(stopSchema).max(MAX_STOPS).optional(),
  passengerName: z.string().trim().min(1).max(100).optional(),
  passengerPhone: z.string().trim().min(6).max(20).optional(),
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
  stops: z.array(stopSchema).max(MAX_STOPS).optional(),
  passengerName: z.string().trim().min(1).max(100).optional(),
  passengerPhone: z.string().trim().min(6).max(20).optional(),
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
// stops arrives as a JSON-encoded string, like every other query param -
// parsed and validated against the same shape the body schemas use.
const estimateRideSchema = z.object({
  pickupLat: z.coerce.number().min(-90).max(90),
  pickupLng: z.coerce.number().min(-180).max(180),
  destinationLat: z.coerce.number().min(-90).max(90),
  destinationLng: z.coerce.number().min(-180).max(180),
  stops: z
    .string()
    .optional()
    .transform((val, ctx) => {
      if (!val) return undefined;
      let parsed;
      try {
        parsed = JSON.parse(val);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'stops must be a JSON-encoded array' });
        return z.NEVER;
      }
      const result = z.array(stopSchema).max(MAX_STOPS).safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid stops' });
        return z.NEVER;
      }
      return result.data;
    }),
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
