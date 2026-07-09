const { z } = require('zod');

const ridesReportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  driverId: z.string().uuid().optional(),
  status: z.enum(['SCHEDULED', 'REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANKILY', 'SEDAD', 'MASRIVI', 'WALLET', 'COMPANY']).optional(),
});

const revenueReportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  groupBy: z.enum(['driver', 'day', 'week', 'month']).optional(),
  driverId: z.string().uuid().optional(),
});

const expensesReportQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  category: z.enum(['FUEL', 'MAINTENANCE', 'INSURANCE', 'SALARY', 'RENT', 'OTHER']).optional(),
});

module.exports = { ridesReportQuerySchema, revenueReportQuerySchema, expensesReportQuerySchema };
