const { z } = require('zod');
const { MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');

const TOPUP_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

const createTopUpSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(MOBILE_MONEY_METHODS),
  payerPhone: z.string().trim().min(6).max(20),
});

const topUpIdParamSchema = z.object({
  id: z.string().uuid('Invalid top-up id'),
});

const listTopUpsQuerySchema = z.object({
  status: z.enum(TOPUP_STATUS_VALUES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

module.exports = {
  TOPUP_STATUS_VALUES,
  createTopUpSchema,
  topUpIdParamSchema,
  listTopUpsQuerySchema,
};
