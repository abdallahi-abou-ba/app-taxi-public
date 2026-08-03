const { z } = require('zod');

const TOPUP_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

// Wallet top-ups only go through Bankily's B-Pay merchant code now (see
// wallet.service.js#createTopUp, which hardcodes method: 'BANKILY') - the
// driver no longer picks an app or declares a payer phone.
const createTopUpSchema = z.object({
  amount: z.coerce.number().positive(),
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
