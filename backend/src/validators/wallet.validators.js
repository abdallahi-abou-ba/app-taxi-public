const { z } = require('zod');
const { WALLET_TOPUP_PRESET_AMOUNTS } = require('../utils/walletTopup.util');

const TOPUP_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'CANCELLED'];

// Wallet top-ups only go through Bankily's B-Pay merchant code now (see
// wallet.service.js#createTopUp, which hardcodes method: 'BANKILY') - the
// driver no longer picks an app or declares a payer phone. amount must be
// one of WALLET_TOPUP_PRESET_AMOUNTS (enforced by the mobile UI as preset
// buttons, revalidated here). confirmationCode is the code Bankily SMS's the
// driver after the B-Pay payment completes - the admin cross-checks it
// against the company's own merchant SMS before confirming.
const createTopUpSchema = z.object({
  amount: z.coerce.number().refine((v) => WALLET_TOPUP_PRESET_AMOUNTS.includes(v), {
    message: `amount must be one of ${WALLET_TOPUP_PRESET_AMOUNTS.join(', ')}`,
  }),
  confirmationCode: z.string().trim().min(1).max(50),
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
  WALLET_TOPUP_PRESET_AMOUNTS,
  createTopUpSchema,
  topUpIdParamSchema,
  listTopUpsQuerySchema,
};
