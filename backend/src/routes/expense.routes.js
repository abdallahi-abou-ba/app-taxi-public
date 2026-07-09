const { Router } = require('express');
const controller = require('../controllers/expense.controller');
const validate = require('../middleware/validate.middleware');
const {
  expenseIdParamSchema,
  listExpensesQuerySchema,
  expenseSummaryQuerySchema,
  createExpenseSchema,
  updateExpenseSchema,
} = require('../validators/expense.validators');

// Mounted under /api/admin/expenses by admin.routes.js, which already
// applies requireAuth + requireRole('ADMIN') + requirePermission('EXPENSES').
const router = Router();

router.get('/', validate(listExpensesQuerySchema, 'query'), controller.listExpenses);
router.get('/summary', validate(expenseSummaryQuerySchema, 'query'), controller.getExpenseSummary);
router.post('/', validate(createExpenseSchema, 'body'), controller.createExpense);
router.get('/:id', validate(expenseIdParamSchema, 'params'), controller.getExpense);
router.patch(
  '/:id',
  validate(expenseIdParamSchema, 'params'),
  validate(updateExpenseSchema, 'body'),
  controller.updateExpense
);
router.delete('/:id', validate(expenseIdParamSchema, 'params'), controller.deleteExpense);

module.exports = router;
