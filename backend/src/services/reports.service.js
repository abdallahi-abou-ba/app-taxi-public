const prisma = require('../lib/prisma');
const revenueService = require('./revenue.service');

// Full (unpaginated) row set for a bounded date range - exports are always
// scoped to an explicit period, unlike the admin UI's paginated ride list.
// from/to are required by report.validators.js, so no re-check needed here.
async function getRidesForExport({ from, to, driverId, status, paymentMethod }) {
  return prisma.ride.findMany({
    where: {
      requestedAt: { gte: new Date(from), lte: new Date(to) },
      ...(driverId && { driverId }),
      ...(status && { status }),
      ...(paymentMethod && { paymentMethod }),
    },
    include: {
      client: { select: { fullName: true } },
      driver: { select: { fullName: true } },
    },
    orderBy: { requestedAt: 'asc' },
  });
}

async function getRevenueForExport({ groupBy, driverId, from, to }) {
  return revenueService.getRevenueAggregate({ groupBy: groupBy || 'driver', driverId, from, to });
}

async function getExpensesForExport({ from, to, category }) {
  return prisma.expense.findMany({
    where: {
      expenseDate: { gte: new Date(from), lte: new Date(to) },
      ...(category && { category }),
    },
    include: {
      vehicle: { select: { plate: true } },
      driver: { select: { fullName: true } },
    },
    orderBy: { expenseDate: 'asc' },
  });
}

module.exports = { getRidesForExport, getRevenueForExport, getExpensesForExport };
