const { z } = require('zod');

const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

module.exports = { listNotificationsQuerySchema };
