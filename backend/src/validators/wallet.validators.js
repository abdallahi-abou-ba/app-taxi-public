const { z } = require('zod');
const { MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');

const TOPUP_METHOD_VALUES = ['CARD', ...MOBILE_MONEY_METHODS];
const TOPUP_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

const createTopUpSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(TOPUP_METHOD_VALUES),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
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
  TOPUP_METHOD_VALUES,
  TOPUP_STATUS_VALUES,
  createTopUpSchema,
  topUpIdParamSchema,
  listTopUpsQuerySchema,
};
