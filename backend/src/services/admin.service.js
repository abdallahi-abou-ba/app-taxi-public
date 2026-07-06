const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');

const DRIVER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  vehiclePlate: true,
  vehicleModel: true,
  approvalStatus: true,
  approvedAt: true,
  createdAt: true,
};

const CLIENT_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  createdAt: true,
};

async function listDrivers(status) {
  return prisma.user.findMany({
    where: { role: 'DRIVER', ...(status ? { approvalStatus: status } : {}) },
    select: DRIVER_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

async function setDriverApproval(driverId, approvalStatus) {
  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.role !== 'DRIVER') {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }

  return prisma.user.update({
    where: { id: driverId },
    data: { approvalStatus, approvedAt: approvalStatus === 'APPROVED' ? new Date() : null },
    select: DRIVER_SELECT,
  });
}

async function listClients() {
  return prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: CLIENT_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

const RIDE_STATUSES = ['SCHEDULED', 'REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

async function getGlobalStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalClients, driversByApproval, ridesByStatus, completedAgg, revenueThisMonthAgg, completedToday] =
    await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.groupBy({ by: ['approvalStatus'], where: { role: 'DRIVER' }, _count: { _all: true } }),
      prisma.ride.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.ride.aggregate({ where: { status: 'COMPLETED' }, _count: { _all: true }, _sum: { estimatedFare: true } }),
      prisma.ride.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } },
        _sum: { estimatedFare: true },
      }),
      prisma.ride.count({ where: { status: 'COMPLETED', completedAt: { gte: startOfToday } } }),
    ]);

  const drivers = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of driversByApproval) {
    if (row.approvalStatus) drivers[row.approvalStatus] = row._count._all;
  }

  const ridesByStatusMap = Object.fromEntries(RIDE_STATUSES.map((status) => [status, 0]));
  for (const row of ridesByStatus) {
    ridesByStatusMap[row.status] = row._count._all;
  }

  return {
    totalClients,
    totalDrivers: drivers.PENDING + drivers.APPROVED + drivers.REJECTED,
    driversPending: drivers.PENDING,
    driversApproved: drivers.APPROVED,
    driversRejected: drivers.REJECTED,
    ridesByStatus: ridesByStatusMap,
    totalRides: Object.values(ridesByStatusMap).reduce((sum, count) => sum + count, 0),
    completedRides: completedAgg._count._all,
    completedRidesToday: completedToday,
    totalRevenue: completedAgg._sum.estimatedFare || 0,
    revenueThisMonth: revenueThisMonthAgg._sum.estimatedFare || 0,
  };
}

module.exports = { listDrivers, setDriverApproval, listClients, getGlobalStats };
