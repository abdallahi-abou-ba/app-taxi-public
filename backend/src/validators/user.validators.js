const { z } = require('zod');

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(6).optional(),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  currentLat: z.number().min(-90).max(90).optional(),
  currentLng: z.number().min(-180).max(180).optional(),
});

// Nullable so the app can explicitly unregister on logout.
const updatePushTokenSchema = z.object({
  pushToken: z.string().min(1).nullable(),
});

module.exports = { updateProfileSchema, updateAvailabilitySchema, updatePushTokenSchema };
