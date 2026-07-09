const { z } = require('zod');
const { EXPENSE_CATEGORY_VALUES } = require('../utils/expense.constants');

const EXPENSE_BEARER_VALUES = ['COMPANY', 'DRIVER', 'SHARED'];

const expenseIdParamSchema = z.object({
  id: z.string().uuid('Invalid expense id'),
});

const listExpensesQuerySchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_VALUES).optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const expenseSummaryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// SHARED requires an explicit driverShareAmount (spec 8.4 doesn't define a
// default split, so it must be stated per expense) - not required for
// COMPANY/DRIVER, where the driver's share is implicit (0 or the full
// amount, see expense.constants.js#getDriverBorneAmount).
const bearerRefinement = (data, ctx) => {
  if (data.bearer === 'SHARED' && (data.driverShareAmount === undefined || data.driverShareAmount === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['driverShareAmount'],
      message: 'driverShareAmount is required when bearer is SHARED',
    });
  }
};

const createExpenseSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORY_VALUES),
    amount: z.coerce.number().positive(),
    description: z.string().trim().optional(),
    expenseDate: z.coerce.date().optional(),
    vehicleId: z.string().uuid().optional(),
    driverId: z.string().uuid().optional(),
    receiptUrl: z.string().trim().url().optional(),
    bearer: z.enum(EXPENSE_BEARER_VALUES).default('COMPANY'),
    driverShareAmount: z.coerce.number().nonnegative().optional(),
  })
  .superRefine(bearerRefinement);

const updateExpenseSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORY_VALUES),
    amount: z.coerce.number().positive(),
    description: z.string().trim(),
    expenseDate: z.coerce.date(),
    vehicleId: z.string().uuid().nullable(),
    driverId: z.string().uuid().nullable(),
    receiptUrl: z.string().trim().url(),
    bearer: z.enum(EXPENSE_BEARER_VALUES),
    driverShareAmount: z.coerce.number().nonnegative().nullable(),
  })
  .partial()
  .superRefine(bearerRefinement);

module.exports = {
  EXPENSE_CATEGORY_VALUES,
  EXPENSE_BEARER_VALUES,
  expenseIdParamSchema,
  listExpensesQuerySchema,
  expenseSummaryQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
};
