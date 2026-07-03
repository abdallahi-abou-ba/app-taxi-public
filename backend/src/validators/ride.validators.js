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

module.exports = { requestRideSchema, cancelRideSchema, rateRideSchema, rideIdParamSchema };
