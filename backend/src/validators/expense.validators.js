const { z } = require('zod');

const EXPENSE_CATEGORY_VALUES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'SALARY', 'RENT', 'OTHER'];

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

const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORY_VALUES),
  amount: z.coerce.number().positive(),
  description: z.string().trim().optional(),
  expenseDate: z.coerce.date().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  receiptUrl: z.string().trim().url().optional(),
});

const updateExpenseSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORY_VALUES),
    amount: z.coerce.number().positive(),
    description: z.string().trim(),
    expenseDate: z.coerce.date(),
    vehicleId: z.string().uuid().nullable(),
    driverId: z.string().uuid().nullable(),
    receiptUrl: z.string().trim().url(),
  })
  .partial();

module.exports = {
  EXPENSE_CATEGORY_VALUES,
  expenseIdParamSchema,
  listExpensesQuerySchema,
  expenseSummaryQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
};
