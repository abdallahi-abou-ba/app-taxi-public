const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { EXPENSE_CATEGORY_VALUES, EXPENSE_CATEGORY_GROUPS, getDriverBorneAmount } = require('../utils/expense.constants');

const EXPENSE_INCLUDE = {
  vehicle: { select: { id: true, brand: true, model: true, plate: true } },
  driver: { select: { id: true, fullName: true } },
  createdByUser: { select: { id: true, fullName: true } },
};

async function findExpenseOrThrow(expenseId) {
  const expense = await prisma.expense.findUnique({ where: { id: expenseId }, include: EXPENSE_INCLUDE });
  if (!expense) {
    throw new AppError('Expense not found', 404, 'NOT_FOUND');
  }
  return expense;
}

async function listExpenses({ category, vehicleId, driverId, from, to, page, pageSize }) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 20;
  const where = {
    ...(category && { category }),
    ...(vehicleId && { vehicleId }),
    ...(driverId && { driverId }),
    ...((from || to) && {
      expenseDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) },
    }),
  };

  const [total, expenses, sumAgg] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: EXPENSE_INCLUDE,
      orderBy: { expenseDate: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    expenses,
    total,
    page: pageNum,
    pageSize: pageSizeNum,
    totalPages: Math.ceil(total / pageSizeNum),
    totalAmount: sumAgg._sum.amount || 0,
  };
}

async function getExpenseById(expenseId) {
  return findExpenseOrThrow(expenseId);
}

async function createExpense(input, createdByUserId) {
  return prisma.expense.create({
    data: { ...input, createdByUserId },
    include: EXPENSE_INCLUDE,
  });
}

async function updateExpense(expenseId, updates) {
  await findExpenseOrThrow(expenseId);
  return prisma.expense.update({ where: { id: expenseId }, data: updates, include: EXPENSE_INCLUDE });
}

async function deleteExpense(expenseId) {
  await findExpenseOrThrow(expenseId);
  await prisma.expense.delete({ where: { id: expenseId } });
}

async function getExpenseSummary({ from, to } = {}) {
  const where =
    from || to ? { expenseDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {};

  const [byCategory, totalAgg] = await Promise.all([
    prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true } }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
  ]);

  const categories = Object.fromEntries(EXPENSE_CATEGORY_VALUES.map((c) => [c, 0]));
  const groups = { DRIVER: 0, VEHICLE: 0, PLATFORM: 0, OTHER: 0 };
  for (const row of byCategory) {
    const amount = row._sum.amount || 0;
    categories[row.category] = amount;
    groups[EXPENSE_CATEGORY_GROUPS[row.category] || 'OTHER'] += amount;
  }

  return { total: totalAgg._sum.amount || 0, byCategory: categories, byGroup: groups };
}

// Sum of the portion of a driver's expenses that they personally bear
// (spec 10.4/19.5) over a period - feeds into the driver balance
// calculation (see driverBalance.service.js). Pulled row-by-row rather than
// a SQL SUM because SHARED's driver-borne amount isn't the row's `amount`
// column itself, it's the separate `driverShareAmount`.
async function getDriverBorneExpensesTotal(driverId, { from, to } = {}) {
  const expenses = await prisma.expense.findMany({
    where: {
      driverId,
      bearer: { in: ['DRIVER', 'SHARED'] },
      ...((from || to) && {
        expenseDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) },
      }),
    },
    select: { amount: true, bearer: true, driverShareAmount: true },
  });

  return expenses.reduce((sum, e) => sum + getDriverBorneAmount(e), 0);
}

module.exports = {
  listExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getDriverBorneExpensesTotal,
};
