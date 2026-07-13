const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { hashPassword } = require('../utils/password.util');
const { generateUniqueReferralCode } = require('../utils/referral.util');
const { listDocumentStatus } = require('./driverDocument.service');
const { getDefaultCommissionRate } = require('./appSetting.service');
const { sendPushToUser } = require('../utils/push.util');

const DRIVER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  whatsapp: true,
  vehiclePlate: true,
  vehicleModel: true,
  approvalStatus: true,
  approvedAt: true,
  address: true,
  nationalId: true,
  licenseNumber: true,
  licenseExpiryAt: true,
  contractType: true,
  initialBalance: true,
  creditBalance: true,
  commissionRate: true,
  createdAt: true,
  deletedAt: true,
};

const CLIENT_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  createdAt: true,
};

async function findDriverOrThrow(driverId) {
  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (!driver || driver.role !== 'DRIVER') {
    throw new AppError('Driver not found', 404, 'NOT_FOUND');
  }
  return driver;
}

async function listDrivers(status) {
  return prisma.user.findMany({
    where: { role: 'DRIVER', ...(status ? { approvalStatus: status } : {}) },
    select: DRIVER_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

async function getDriverDetail(driverId) {
  await findDriverOrThrow(driverId);

  const [driver, completedAgg, cancelledCount, documents] = await Promise.all([
    prisma.user.findUnique({ where: { id: driverId }, select: DRIVER_SELECT }),
    prisma.ride.aggregate({
      where: { driverId, status: 'COMPLETED' },
      _count: { _all: true },
      _sum: { estimatedFare: true, commissionAmount: true, driverNetAmount: true },
    }),
    prisma.ride.count({ where: { driverId, status: 'CANCELLED' } }),
    listDocumentStatus(driverId),
  ]);

  return {
    ...driver,
    stats: {
      completedRides: completedAgg._count._all,
      cancelledRides: cancelledCount,
      totalRevenue: completedAgg._sum.estimatedFare || 0,
      totalCommission: completedAgg._sum.commissionAmount || 0,
      totalNetEarnings: completedAgg._sum.driverNetAmount || 0,
    },
    documents,
  };
}

async function createDriver(input) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(input.password);
  const referralCode = await generateUniqueReferralCode();
  const initialBalance = input.initialBalance ?? 0;
  const commissionRate = await getDefaultCommissionRate();

  const driver = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      whatsapp: input.whatsapp,
      role: 'DRIVER',
      isAvailable: false,
      vehiclePlate: input.vehiclePlate,
      vehicleModel: input.vehicleModel,
      approvalStatus: 'PENDING',
      commissionRate,
      address: input.address,
      nationalId: input.nationalId,
      licenseNumber: input.licenseNumber,
      licenseExpiryAt: input.licenseExpiryAt,
      contractType: input.contractType,
      initialBalance,
      creditBalance: initialBalance,
      referralCode,
    },
    select: DRIVER_SELECT,
  });

  return driver;
}

async function updateDriver(driverId, updates) {
  await findDriverOrThrow(driverId);
  return prisma.user.update({ where: { id: driverId }, data: updates, select: DRIVER_SELECT });
}

// Copy for each possible driver approvalStatus transition. PENDING is
// deliberately absent - there's no meaningful "you're back to pending" moment
// worth notifying a driver about.
const DRIVER_STATUS_PUSH_COPY = {
  APPROVED: {
    title: 'Compte validé',
    body: 'Votre compte chauffeur a été approuvé. Vous pouvez maintenant passer en ligne.',
  },
  REJECTED: {
    title: 'Compte rejeté',
    body: "Votre demande de compte chauffeur a été rejetée. Contactez l'assistance pour plus d'informations.",
  },
  SUSPENDED: {
    title: 'Compte suspendu',
    body: 'Votre compte chauffeur a été suspendu.',
  },
  BLOCKED: {
    title: 'Compte bloqué',
    body: "Votre compte a été bloqué. Contactez l'assistance.",
  },
};

// Fire-and-forget, like every other push call site in this app (see
// ride.service.js) - a notification failure must never break the admin
// action that triggered it.
function notifyDriverStatusChange(driver, newStatus) {
  const copy = DRIVER_STATUS_PUSH_COPY[newStatus];
  if (!copy) return;
  sendPushToUser(driver.id, { ...copy, data: { type: 'driver:approval', status: newStatus } });
}

async function setDriverApproval(driverId, approvalStatus) {
  await findDriverOrThrow(driverId);

  const driver = await prisma.user.update({
    where: { id: driverId },
    data: { approvalStatus, approvedAt: approvalStatus === 'APPROVED' ? new Date() : null },
    select: DRIVER_SELECT,
  });
  notifyDriverStatusChange(driver, approvalStatus);
  return driver;
}

// Generalized status change (PENDING/APPROVED/REJECTED/SUSPENDED/BLOCKED),
// used for suspend/block/reactivate from the admin UI. approvedAt is only
// meaningful for APPROVED, mirroring setDriverApproval above.
async function setDriverStatus(driverId, status) {
  await findDriverOrThrow(driverId);

  const driver = await prisma.user.update({
    where: { id: driverId },
    data: { approvalStatus: status, approvedAt: status === 'APPROVED' ? new Date() : null },
    select: DRIVER_SELECT,
  });
  notifyDriverStatusChange(driver, status);
  return driver;
}

// Archive (soft-delete), mirroring user.service.js#deleteAccount's shape but
// admin-initiated (no password confirmation) and without anonymizing PII -
// an admin archiving a driver still wants their name/email visible in
// historical rides and reports, just excluded from active driver lists.
async function archiveDriver(driverId) {
  await findDriverOrThrow(driverId);

  const hasActiveRide = await prisma.ride.findFirst({
    where: { driverId, status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] } },
  });
  if (hasActiveRide) {
    throw new AppError('This driver has an active ride and cannot be archived', 409, 'CONFLICT');
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: driverId },
      data: { deletedAt: new Date(), isAvailable: false },
    }),
    prisma.refreshToken.updateMany({ where: { userId: driverId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

async function setCommissionRate(driverId, adminUserId, newRate, reason) {
  const driver = await findDriverOrThrow(driverId);

  const [, updated] = await prisma.$transaction([
    prisma.commissionChange.create({
      data: { driverId, oldRate: driver.commissionRate, newRate, reason, changedByUserId: adminUserId },
    }),
    prisma.user.update({ where: { id: driverId }, data: { commissionRate: newRate }, select: DRIVER_SELECT }),
  ]);

  return updated;
}

async function getCommissionHistory(driverId) {
  await findDriverOrThrow(driverId);
  return prisma.commissionChange.findMany({
    where: { driverId },
    orderBy: { changedAt: 'desc' },
    include: { changedByUser: { select: { id: true, fullName: true } } },
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
const DRIVER_STATUS_KEYS = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'BLOCKED'];

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
      prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _count: { _all: true },
        _sum: { estimatedFare: true, commissionAmount: true, driverNetAmount: true },
      }),
      prisma.ride.aggregate({
        where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } },
        _sum: { estimatedFare: true, commissionAmount: true, driverNetAmount: true },
      }),
      prisma.ride.count({ where: { status: 'COMPLETED', completedAt: { gte: startOfToday } } }),
    ]);

  const drivers = Object.fromEntries(DRIVER_STATUS_KEYS.map((status) => [status, 0]));
  for (const row of driversByApproval) {
    if (row.approvalStatus) drivers[row.approvalStatus] = row._count._all;
  }

  const ridesByStatusMap = Object.fromEntries(RIDE_STATUSES.map((status) => [status, 0]));
  for (const row of ridesByStatus) {
    ridesByStatusMap[row.status] = row._count._all;
  }

  return {
    totalClients,
    totalDrivers: DRIVER_STATUS_KEYS.reduce((sum, key) => sum + drivers[key], 0),
    driversPending: drivers.PENDING,
    driversApproved: drivers.APPROVED,
    driversRejected: drivers.REJECTED,
    driversSuspended: drivers.SUSPENDED,
    driversBlocked: drivers.BLOCKED,
    ridesByStatus: ridesByStatusMap,
    totalRides: Object.values(ridesByStatusMap).reduce((sum, count) => sum + count, 0),
    completedRides: completedAgg._count._all,
    completedRidesToday: completedToday,
    totalRevenue: completedAgg._sum.estimatedFare || 0,
    totalCommission: completedAgg._sum.commissionAmount || 0,
    totalDriverNet: completedAgg._sum.driverNetAmount || 0,
    revenueThisMonth: revenueThisMonthAgg._sum.estimatedFare || 0,
    commissionThisMonth: revenueThisMonthAgg._sum.commissionAmount || 0,
    driverNetThisMonth: revenueThisMonthAgg._sum.driverNetAmount || 0,
  };
}

module.exports = {
  listDrivers,
  getDriverDetail,
  createDriver,
  updateDriver,
  setDriverApproval,
  setDriverStatus,
  archiveDriver,
  setCommissionRate,
  getCommissionHistory,
  listClients,
  getGlobalStats,
};
