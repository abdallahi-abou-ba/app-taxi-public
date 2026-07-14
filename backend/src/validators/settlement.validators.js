const { z } = require('zod');
const { MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');

const SETTLEMENT_STATUS_VALUES = ['PENDING', 'PAID', 'CANCELLED'];

const settlementIdParamSchema = z.object({
  id: z.string().uuid('Invalid settlement id'),
});

const listSettlementsQuerySchema = z.object({
  driverId: z.string().uuid().optional(),
  status: z.enum(SETTLEMENT_STATUS_VALUES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const createSettlementSchema = z.object({
  driverId: z.string().uuid(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().trim().max(500).optional(),
});

const declareSettlementPaidSchema = z.object({
  paymentMethod: z.enum(MOBILE_MONEY_METHODS),
});

module.exports = {
  SETTLEMENT_STATUS_VALUES,
  settlementIdParamSchema,
  listSettlementsQuerySchema,
  createSettlementSchema,
  declareSettlementPaidSchema,
};
