const { z } = require('zod');

const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

module.exports = { updateLocationSchema };
