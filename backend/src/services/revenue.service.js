const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

async function getRevenueByDriver({ from, to }) {
  const where = {
    status: 'COMPLETED',
    ...((from || to) && { completedAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } }),
  };

  const grouped = await prisma.ride.groupBy({
    by: ['driverId'],
    where,
    _sum: { estimatedFare: true, commissionAmount: true, driverNetAmount: true },
    _count: { _all: true },
  });

  const driverIds = grouped.map((g) => g.driverId).filter(Boolean);
  const drivers = await prisma.user.findMany({ where: { id: { in: driverIds } }, select: { id: true, fullName: true } });
  const nameById = Object.fromEntries(drivers.map((d) => [d.id, d.fullName]));

  return grouped.map((g) => ({
    driverId: g.driverId,
    driverName: g.driverId ? nameById[g.driverId] || null : null,
    grossRevenue: g._sum.estimatedFare || 0,
    commission: g._sum.commissionAmount || 0,
    driverNet: g._sum.driverNetAmount || 0,
    rideCount: g._count._all,
  }));
}

// Prisma's groupBy can't truncate dates, so day/week/month bucketing needs
// raw SQL - the only such usage in the app. `granularity` is passed as a
// bound $queryRaw parameter (never string-interpolated) even though it's
// already whitelisted by revenueQuerySchema's z.enum, belt-and-suspenders
// against SQL injection since this is the app's one raw-SQL surface.
async function getRevenueByPeriod({ granularity, driverId, from, to }) {
  const driverFilter = driverId ? Prisma.sql`AND "driverId" = ${driverId}` : Prisma.empty;
  const fromFilter = from ? Prisma.sql`AND "completedAt" >= ${new Date(from)}` : Prisma.empty;
  const toFilter = to ? Prisma.sql`AND "completedAt" <= ${new Date(to)}` : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT date_trunc(${granularity}, "completedAt") AS bucket,
           COALESCE(SUM("estimatedFare"), 0) AS "grossRevenue",
           COALESCE(SUM("commissionAmount"), 0) AS "commission",
           COALESCE(SUM("driverNetAmount"), 0) AS "driverNet",
           COUNT(*)::int AS "rideCount"
    FROM rides
    WHERE status = 'COMPLETED' ${driverFilter} ${fromFilter} ${toFilter}
    GROUP BY bucket
    ORDER BY bucket;
  `;

  return rows.map((row) => ({ ...row, bucket: row.bucket }));
}

async function getRevenueAggregate({ groupBy, driverId, from, to }) {
  if (groupBy === 'driver') return getRevenueByDriver({ from, to });
  return getRevenueByPeriod({ granularity: groupBy, driverId, from, to });
}

module.exports = { getRevenueAggregate };
