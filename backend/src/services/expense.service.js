const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');

const EXPENSE_CATEGORIES = ['FUEL', 'MAINTENANCE', 'INSURANCE', 'SALARY', 'RENT', 'OTHER'];

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

  const categories = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0]));
  for (const row of byCategory) {
    categories[row.category] = row._sum.amount || 0;
  }

  return { total: totalAgg._sum.amount || 0, byCategory: categories };
}

module.exports = { listExpenses, getExpenseById, createExpense, updateExpense, deleteExpense, getExpenseSummary };
