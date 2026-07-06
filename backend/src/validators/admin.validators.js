const { z } = require('zod');

const driverIdParamSchema = z.object({
  id: z.string().uuid('Invalid driver id'),
});

const listDriversQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

module.exports = { driverIdParamSchema, listDriversQuerySchema };
