const { z } = require('zod');

const requestRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(1).optional(),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationAddress: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
});

const scheduleRideSchema = z.object({
  pickupLat: z.number().min(-90).max(90),
  pickupLng: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(1).optional(),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  destinationAddress: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
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
};
