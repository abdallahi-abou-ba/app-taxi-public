const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const expenseService = require('../services/expense.service');
const activityLogService = require('../services/activityLog.service');

const listExpenses = asyncHandler(async (req, res) => {
  const { page, pageSize, ...filters } = req.query;
  const result = await expenseService.listExpenses({ ...filters, page, pageSize });
  sendSuccess(res, {
    data: result.expenses,
    meta: {
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
      totalAmount: result.totalAmount,
    },
  });
});

const getExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.getExpenseById(req.params.id);
  sendSuccess(res, { data: expense });
});

const getExpenseSummary = asyncHandler(async (req, res) => {
  const summary = await expenseService.getExpenseSummary(req.query);
  sendSuccess(res, { data: summary });
});

const createExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.createExpense(req.body, req.user.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'EXPENSE_CREATED',
    entityType: 'EXPENSE',
    entityId: expense.id,
    details: { category: expense.category, amount: expense.amount },
  });
  sendSuccess(res, { data: expense, status: 201 });
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await expenseService.updateExpense(req.params.id, req.body);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'EXPENSE_UPDATED',
    entityType: 'EXPENSE',
    entityId: expense.id,
    details: { fields: Object.keys(req.body) },
  });
  sendSuccess(res, { data: expense });
});

const deleteExpense = asyncHandler(async (req, res) => {
  await expenseService.deleteExpense(req.params.id);
  await activityLogService.logActivity({
    adminUserId: req.user.id,
    action: 'EXPENSE_DELETED',
    entityType: 'EXPENSE',
    entityId: req.params.id,
  });
  sendSuccess(res, { data: { id: req.params.id } });
});

module.exports = { listExpenses, getExpense, getExpenseSummary, createExpense, updateExpense, deleteExpense };
