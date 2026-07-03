const prisma = require('../lib/prisma');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { haversineDistanceKm } = require('../utils/geo.util');
const { getRoute } = require('../utils/osrm.util');
const { estimateFare } = require('../utils/fare.util');
const { getIO } = require('../lib/socket');
const rideTracker = require('../sockets/rideTracker');
const { sendPushToUser } = require('../utils/push.util');

// Real road-network distance/duration come from OSRM when reachable (see
// utils/osrm.util.js). This flat speed assumption is only the fallback for
// when OSRM can't be reached.
const AVG_SPEED_KMH = 30;
const MAX_MATCHED_DRIVERS = 10;

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];

// Public counterpart info attached to every ride returned to a client - just
// enough for each side to know who they're dealing with (name/phone/rating),
// never the full user record.
const RIDE_INCLUDE = {
  client: { select: { id: true, fullName: true, phone: true, ratingAverage: true, ratingCount: true } },
  driver: { select: { id: true, fullName: true, phone: true, ratingAverage: true, ratingCount: true } },
};

const TRANSITIONS = {
  arrive: { from: 'ACCEPTED', to: 'ARRIVED', timestampField: 'arrivedAt' },
  start: { from: 'ARRIVED', to: 'IN_PROGRESS', timestampField: 'startedAt' },
  complete: { from: 'IN_PROGRESS', to: 'COMPLETED', timestampField: 'completedAt' },
};

function emitToUser(userId, event, payload) {
  const io = getIO();
  if (io && userId) io.to(`user:${userId}`).emit(event, payload);
}

function emitRideStatus(ride) {
  emitToUser(ride.clientId, 'ride:status', ride);
  emitToUser(ride.driverId, 'ride:status', ride);
}

async function findNearbyAvailableDrivers(pickupLat, pickupLng) {
  const candidates = await prisma.user.findMany({
    where: { role: 'DRIVER', isAvailable: true, currentLat: { not: null }, currentLng: { not: null } },
  });

  return candidates
    .map((driver) => ({ driver, distanceKm: haversineDistanceKm(pickupLat, pickupLng, driver.currentLat, driver.currentLng) }))
    .filter(({ distanceKm }) => distanceKm <= env.SEARCH_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_MATCHED_DRIVERS);
}

async function requestRide(clientId, input) {
  const existingActive = await prisma.ride.findFirst({ where: { clientId, status: { in: ACTIVE_STATUSES } } });
  if (existingActive) {
    throw new AppError('You already have an active ride', 409, 'CONFLICT');
  }

  const { pickupLat, pickupLng, destinationLat, destinationLng } = input;
  const route = await getRoute(pickupLat, pickupLng, destinationLat, destinationLng);
  const distanceKm = route ? route.distanceKm : haversineDistanceKm(pickupLat, pickupLng, destinationLat, destinationLng);
  const durationMin = route ? route.durationMin : (distanceKm / AVG_SPEED_KMH) * 60;
  const estimatedFare = estimateFare(distanceKm, durationMin);

  const ride = await prisma.ride.create({
    data: { clientId, ...input, distanceKm, durationMin, estimatedFare, routeGeometry: route ? route.geometry : undefined },
    include: RIDE_INCLUDE,
  });

  const nearbyDrivers = await findNearbyAvailableDrivers(pickupLat, pickupLng);
  for (const { driver } of nearbyDrivers) {
    emitToUser(driver.id, 'ride:new', ride);
    // Fire-and-forget: never awaited, so a slow/failed push to one driver
    // can't delay the response or block notifying the rest.
    sendPushToUser(driver.id, { title: 'New ride request', body: `${ride.client.fullName} needs a pickup nearby`, data: { rideId: ride.id, type: 'ride:new' } });
  }

  return ride;
}

function assertParticipant(ride, userId) {
  if (ride.clientId !== userId && ride.driverId !== userId) {
    throw new AppError('You are not part of this ride', 403, 'FORBIDDEN');
  }
}

async function getRideById(userId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  assertParticipant(ride, userId);
  return ride;
}

async function listRides(userId) {
  return prisma.ride.findMany({
    where: {
      OR: [
        { clientId: userId, hiddenByClient: false },
        { driverId: userId, hiddenByDriver: false },
      ],
    },
    orderBy: { requestedAt: 'desc' },
    take: 50,
    include: RIDE_INCLUDE,
  });
}

async function getActiveRide(userId) {
  return prisma.ride.findFirst({
    where: { status: { in: ACTIVE_STATUSES }, OR: [{ clientId: userId }, { driverId: userId }] },
    include: RIDE_INCLUDE,
  });
}

async function acceptRide(driverId, rideId) {
  const existingActive = await prisma.ride.findFirst({ where: { driverId, status: { in: ACTIVE_STATUSES } } });
  if (existingActive) {
    throw new AppError('You already have an active ride', 409, 'CONFLICT');
  }

  // Atomic: the WHERE status: 'REQUESTED' check and the write happen in one
  // statement, so if two drivers accept at once only the first one wins.
  const { count } = await prisma.ride.updateMany({
    where: { id: rideId, status: 'REQUESTED' },
    data: { driverId, status: 'ACCEPTED', acceptedAt: new Date() },
  });

  if (count === 0) {
    throw new AppError('Ride is no longer available', 409, 'CONFLICT');
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
  rideTracker.setActiveRide(driverId, { rideId: ride.id, clientId: ride.clientId });
  emitToUser(ride.clientId, 'ride:accepted', ride);
  sendPushToUser(ride.clientId, { title: 'Driver on the way', body: `${ride.driver.fullName} accepted your ride`, data: { rideId: ride.id, type: 'ride:accepted' } });
  return ride;
}

async function transitionRide(driverId, rideId, action) {
  const { from, to, timestampField } = TRANSITIONS[action];

  const { count } = await prisma.ride.updateMany({
    where: { id: rideId, driverId, status: from },
    data: { status: to, [timestampField]: new Date() },
  });

  if (count === 0) {
    throw new AppError(`Ride cannot be moved to ${to} from its current state`, 409, 'CONFLICT');
  }

  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
  if (to === 'COMPLETED') {
    rideTracker.clearActiveRide(driverId);
  }

  emitRideStatus(ride);
  // Only the client gets pushed here - the driver already knows, they're the
  // one who just tapped the button. "start" is skipped entirely (low value).
  if (action === 'arrive') {
    sendPushToUser(ride.clientId, { title: 'Your driver has arrived', body: `${ride.driver.fullName} is waiting outside`, data: { rideId: ride.id, type: 'ride:status' } });
  } else if (action === 'complete') {
    sendPushToUser(ride.clientId, { title: 'Ride completed', body: 'Rate your driver to help other riders', data: { rideId: ride.id, type: 'ride:status' } });
  }
  return ride;
}

async function cancelRide(userId, role, rideId, reason) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  assertParticipant(ride, userId);

  const { count } = await prisma.ride.updateMany({
    where: { id: rideId, status: { in: ACTIVE_STATUSES } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: role, cancellationReason: reason },
  });

  if (count === 0) {
    throw new AppError('This ride can no longer be cancelled', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
  if (updated.driverId) {
    rideTracker.clearActiveRide(updated.driverId);
  }

  emitRideStatus(updated);
  const counterpartId = updated.clientId === userId ? updated.driverId : updated.clientId;
  sendPushToUser(counterpartId, { title: 'Ride cancelled', body: 'Your ride was cancelled', data: { rideId: updated.id, type: 'ride:status' } });
  return updated;
}

async function rateRide(userId, role, rideId, { rating, comment }) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }

  const isClient = role === 'CLIENT' && ride.clientId === userId;
  const isDriver = role === 'DRIVER' && ride.driverId === userId;
  if (!isClient && !isDriver) {
    throw new AppError('You are not part of this ride', 403, 'FORBIDDEN');
  }

  if (ride.status !== 'COMPLETED') {
    throw new AppError('You can only rate a completed ride', 409, 'CONFLICT');
  }

  const ratingField = isClient ? 'driverRating' : 'clientRating';
  const commentField = isClient ? 'driverRatingComment' : 'clientRatingComment';
  const rateeId = isClient ? ride.driverId : ride.clientId;

  if (ride[ratingField] != null) {
    throw new AppError('You have already rated this ride', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { [ratingField]: rating, [commentField]: comment },
    include: RIDE_INCLUDE,
  });

  const ratee = await prisma.user.findUnique({ where: { id: rateeId } });
  const newCount = ratee.ratingCount + 1;
  const newAverage = ((ratee.ratingAverage || 0) * ratee.ratingCount + rating) / newCount;
  await prisma.user.update({ where: { id: rateeId }, data: { ratingAverage: newAverage, ratingCount: newCount } });

  return updated;
}

// Cash-only: the driver marks a completed ride paid once they've collected
// cash in person. No amount/method to record - just the one flag.
async function markRidePaid(driverId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.driverId !== driverId) {
    throw new AppError('You are not the driver for this ride', 403, 'FORBIDDEN');
  }
  if (ride.status !== 'COMPLETED') {
    throw new AppError('A ride can only be marked as paid once it is completed', 409, 'CONFLICT');
  }
  if (ride.isPaid) {
    throw new AppError('This ride is already marked as paid', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { isPaid: true, paidAt: new Date() },
    include: RIDE_INCLUDE,
  });

  // So the client's screen reflects it live too, reusing the same event
  // ActiveRideScreen already listens on for every other status change.
  emitRideStatus(updated);
  return updated;
}

const HIDE_FIELD = { CLIENT: 'hiddenByClient', DRIVER: 'hiddenByDriver' };

// Per-user "trash": only flips the caller's own hidden flag, so the ride
// stays intact (and visible) for the other participant.
async function hideRideFromHistory(userId, role, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }

  const isClient = role === 'CLIENT' && ride.clientId === userId;
  const isDriver = role === 'DRIVER' && ride.driverId === userId;
  if (!isClient && !isDriver) {
    throw new AppError('You are not part of this ride', 403, 'FORBIDDEN');
  }

  if (ACTIVE_STATUSES.includes(ride.status)) {
    throw new AppError('An active ride cannot be removed from history', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { [HIDE_FIELD[role]]: true },
  });

  return { id: updated.id };
}

async function getStats(userId, role) {
  const field = role === 'DRIVER' ? 'driverId' : 'clientId';
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [completedAgg, ridesThisMonth] = await Promise.all([
    prisma.ride.aggregate({
      where: { [field]: userId, status: 'COMPLETED' },
      _count: { _all: true },
      _sum: { estimatedFare: true },
    }),
    prisma.ride.count({
      where: { [field]: userId, status: 'COMPLETED', completedAt: { gte: startOfMonth } },
    }),
  ]);

  return {
    completedRides: completedAgg._count._all,
    totalAmount: completedAgg._sum.estimatedFare || 0,
    ridesThisMonth,
  };
}

module.exports = {
  requestRide,
  getRideById,
  listRides,
  getActiveRide,
  acceptRide,
  arriveRide: (driverId, rideId) => transitionRide(driverId, rideId, 'arrive'),
  startRide: (driverId, rideId) => transitionRide(driverId, rideId, 'start'),
  completeRide: (driverId, rideId) => transitionRide(driverId, rideId, 'complete'),
  cancelRide,
  rateRide,
  markRidePaid,
  hideRideFromHistory,
  getStats,
  ACTIVE_STATUSES,
};
