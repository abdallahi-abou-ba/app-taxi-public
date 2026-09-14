const crypto = require('crypto');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const logger = require('../config/logger');
const AppError = require('../utils/appError');
const { haversineDistanceKm } = require('../utils/geo.util');
const { getRoute } = require('../utils/osrm.util');
const { reverseGeocode } = require('../utils/geocode.util');
const { estimateFare } = require('../utils/fare.util');
const { publishToUser } = require('../lib/realtime');
const { sendPushToUser } = require('../utils/push.util');
const { safeWaitUntil } = require('../lib/waitUntil');
const paymentService = require('./payment.service');
const { getDefaultCommissionRate, getMinBalanceToGoOnline, getDriverAutoSuspendHours } = require('./appSetting.service');
const { MOBILE_MONEY_METHODS } = require('../utils/paymentMethod.util');
const { DEMAND_ZONES } = require('../config/demandZones');

// Real road-network distance/duration come from OSRM when reachable (see
// utils/osrm.util.js). This flat speed assumption is only the fallback for
// when OSRM can't be reached.
const AVG_SPEED_KMH = 30;
const MAX_MATCHED_DRIVERS = 10;

const ACTIVE_STATUSES = ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'];

// Consecutive driver-initiated cancellations (see cancelRide) that trigger an
// automatic, time-bounded suspension - see User.cancelStreak/autoSuspendedUntil.
const AUTO_SUSPEND_CANCEL_THRESHOLD = 5;

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
  if (userId) publishToUser(userId, event, payload);
}

function emitRideStatus(ride) {
  emitToUser(ride.clientId, 'ride:status', ride);
  emitToUser(ride.driverId, 'ride:status', ride);
}

// Shared by acceptRide and user.service.js#updateAvailability - both are
// "can this driver work right now" gates, so one message/threshold source
// keeps them from drifting apart over time.
function assertNotAutoSuspended(driver) {
  if (driver.autoSuspendedUntil && driver.autoSuspendedUntil > new Date()) {
    const remainingMs = driver.autoSuspendedUntil.getTime() - Date.now();
    const remainingMin = Math.max(1, Math.ceil(remainingMs / 60000));
    const hours = Math.floor(remainingMin / 60);
    const minutes = remainingMin % 60;
    const remainingLabel = hours > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${minutes}min`;
    throw new AppError(
      `Your account is temporarily suspended for ${AUTO_SUSPEND_CANCEL_THRESHOLD} consecutive cancellations. Try again in ${remainingLabel}.`,
      403,
      'FORBIDDEN'
    );
  }
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

// Booking (immediate or scheduled) is one-at-a-time: a client with a pending
// SCHEDULED ride can't also start an immediate one, and vice versa.
const BOOKED_STATUSES = [...ACTIVE_STATUSES, 'SCHEDULED'];

// The mobile app only ever sends raw lat/lng (map tap, no address input) -
// resolve a human-readable place name here so ride summaries show a name
// instead of coordinates. Skipped for whichever side already has an address
// (e.g. a future client-supplied value), and never blocks ride creation on
// failure - see geocode.util.js's null-on-failure contract (which also
// internally paces these two calls to respect Nominatim's rate limit).
// Stops are never geocoded here (only pickup/destination are, synchronously) -
// with Nominatim's ~1.1s inter-call throttle, geocoding up to MAX_STOPS more
// points would add several seconds to ride creation. Stop addresses are
// instead backfilled by the same fire-and-forget pass that already handles
// the Arabic pickup/destination addresses - see doEnrichRideAddressesInArabic.
async function computeRouteAndFare(
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  existingPickupAddress,
  existingDestinationAddress,
  stops = []
) {
  const points = [{ lat: pickupLat, lng: pickupLng }, ...stops, { lat: destinationLat, lng: destinationLng }];
  const [route, pickupAddress, destinationAddress] = await Promise.all([
    getRoute(points),
    existingPickupAddress ? Promise.resolve(existingPickupAddress) : reverseGeocode(pickupLat, pickupLng),
    existingDestinationAddress ? Promise.resolve(existingDestinationAddress) : reverseGeocode(destinationLat, destinationLng),
  ]);
  const distanceKm = route ? route.distanceKm : haversineDistanceKm(pickupLat, pickupLng, destinationLat, destinationLng);
  const durationMin = route ? route.durationMin : (distanceKm / AVG_SPEED_KMH) * 60;
  const estimatedFare = estimateFare(distanceKm, durationMin);
  return {
    distanceKm,
    durationMin,
    estimatedFare,
    routeGeometry: route ? route.geometry : undefined,
    pickupAddress: pickupAddress || undefined,
    destinationAddress: destinationAddress || undefined,
    ...(stops.length > 0 && { stops: stops.map((s) => ({ lat: s.lat, lng: s.lng, address: null, addressAr: null })) }),
  };
}

// Nominatim only returns one language per request, so the Arabic variant
// costs a second serialized round-trip per point - fetched fire-and-forget
// after the ride row already exists, rather than blocking ride creation (and
// doubling the synchronous French lookup's latency) on it. Never throws, and
// silently does nothing if both lookups come back null (same failure
// contract as reverseGeocode itself). Callers below don't await this - on
// Vercel the function can freeze right after the response is sent, so the
// work is registered with waitUntil() here rather than at every call site.
//
// Also backfills stop addresses (both French and Arabic) - stops skip
// synchronous geocoding entirely in computeRouteAndFare, so this pass is the
// only place they ever get an address at all.
function enrichRideAddressesInArabic(ride) {
  return safeWaitUntil(doEnrichRideAddressesInArabic(ride));
}

async function doEnrichRideAddressesInArabic(ride) {
  try {
    const [pickupAddressAr, destinationAddressAr, enrichedStops] = await Promise.all([
      reverseGeocode(ride.pickupLat, ride.pickupLng, 'ar'),
      reverseGeocode(ride.destinationLat, ride.destinationLng, 'ar'),
      Promise.all(
        (ride.stops || []).map(async (stop) => {
          const [address, addressAr] = await Promise.all([
            reverseGeocode(stop.lat, stop.lng, 'fr'),
            reverseGeocode(stop.lat, stop.lng, 'ar'),
          ]);
          return { ...stop, address: address || stop.address, addressAr: addressAr || stop.addressAr };
        })
      ),
    ]);
    const stopsChanged = (ride.stops || []).length > 0;
    if (!pickupAddressAr && !destinationAddressAr && !stopsChanged) return;

    // updateMany (not update) so a since-deleted/cancelled-and-purged ride
    // doesn't throw here.
    const { count } = await prisma.ride.updateMany({
      where: { id: ride.id },
      data: {
        ...(pickupAddressAr && { pickupAddressAr }),
        ...(destinationAddressAr && { destinationAddressAr }),
        ...(stopsChanged && { stops: enrichedStops }),
      },
    });
    if (count === 0) return;

    const updated = await prisma.ride.findUnique({ where: { id: ride.id }, include: RIDE_INCLUDE });
    if (updated) emitRideStatus(updated);
  } catch (err) {
    logger.warn(`Arabic address enrichment failed for ride ${ride.id}: ${err.message}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A single push is easy to miss while driving with the phone in a pocket -
// re-sends at +8s/+16s make it feel closer to a phone ringing, stopping
// early if the ride's been taken (by this driver or another) or cancelled.
// Runs past the HTTP response via waitUntil (see lib/waitUntil.js), so the
// whole ~16s sequence must stay well under the function's 30s maxDuration
// (backend/vercel.json).
const RING_REPEAT_DELAYS_MS = [8000, 16000];

function ringDriverForRide(driverId, ride) {
  const push = () =>
    sendPushToUser(driverId, {
      title: 'Nouvelle course',
      body: `${ride.client.fullName} a besoin d'être pris en charge`,
      data: { rideId: ride.id, type: 'ride:new' },
      priority: 'high',
      interruptionLevel: 'time-sensitive',
      channelId: 'ride-alerts',
    });

  // Skip the delayed repeats in tests - real setTimeout()s of up to 16s
  // would dangle past each test's assertions and slow down/hang the suite.
  // A single immediate push is enough to cover the send-with-priority-
  // fields behavior; the repeat scheduling itself has no separate test.
  if (env.NODE_ENV === 'test') return push();

  return safeWaitUntil(
    (async () => {
      push();
      for (const delay of RING_REPEAT_DELAYS_MS) {
        await sleep(delay);
        const current = await prisma.ride.findUnique({ where: { id: ride.id }, select: { status: true } });
        if (!current || current.status !== 'REQUESTED') return;
        push();
      }
    })()
  );
}

async function broadcastToNearbyDrivers(ride) {
  const nearbyDrivers = await findNearbyAvailableDrivers(ride.pickupLat, ride.pickupLng);
  logger.info(
    `Ride ${ride.id}: matched ${nearbyDrivers.length} nearby driver(s) - ${nearbyDrivers
      .map(({ driver, distanceKm }) => `${driver.id.slice(0, 8)}@${distanceKm.toFixed(1)}km`)
      .join(', ') || 'none'}`
  );
  for (const { driver } of nearbyDrivers) {
    emitToUser(driver.id, 'ride:new', ride);
    ringDriverForRide(driver.id, ride);
  }
}

async function requestRide(clientId, input) {
  const existingActive = await prisma.ride.findFirst({ where: { clientId, status: { in: BOOKED_STATUSES } } });
  if (existingActive) {
    throw new AppError('You already have an active ride', 409, 'CONFLICT');
  }

  const { pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress, stops } = input;
  const routeData = await computeRouteAndFare(pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress, stops);

  const ride = await prisma.ride.create({
    data: { clientId, ...input, ...routeData },
    include: RIDE_INCLUDE,
  });

  enrichRideAddressesInArabic(ride);
  await broadcastToNearbyDrivers(ride);
  return ride;
}

async function scheduleRide(clientId, input) {
  const existingActive = await prisma.ride.findFirst({ where: { clientId, status: { in: BOOKED_STATUSES } } });
  if (existingActive) {
    throw new AppError('You already have an active ride', 409, 'CONFLICT');
  }

  const { pickupLat, pickupLng, destinationLat, destinationLng, scheduledFor, pickupAddress, destinationAddress, stops } = input;
  const scheduledDate = new Date(scheduledFor);
  const minLeadMs = env.SCHEDULED_RIDE_MIN_LEAD_MIN * 60 * 1000;
  if (scheduledDate.getTime() < Date.now() + minLeadMs) {
    throw new AppError(`Scheduled rides must be booked at least ${env.SCHEDULED_RIDE_MIN_LEAD_MIN} minutes in advance`, 422, 'VALIDATION_ERROR');
  }

  const routeData = await computeRouteAndFare(pickupLat, pickupLng, destinationLat, destinationLng, pickupAddress, destinationAddress, stops);

  const ride = await prisma.ride.create({
    data: { clientId, ...input, scheduledFor: scheduledDate, status: 'SCHEDULED', ...routeData },
    include: RIDE_INCLUDE,
  });

  enrichRideAddressesInArabic(ride);
  return ride;
}

async function listScheduledRides(clientId) {
  return prisma.ride.findMany({
    where: { clientId, status: 'SCHEDULED' },
    orderBy: { scheduledFor: 'asc' },
    include: RIDE_INCLUDE,
  });
}

// Flips a booked-ahead ride to REQUESTED once it's within the activation
// window, resets requestedAt to that moment (so "still searching" timing is
// relative to activation, not the original booking), then broadcasts exactly
// like a fresh immediate request. Run periodically - see jobs/scheduling.job.js.
async function activateScheduledRides() {
  const cutoff = new Date(Date.now() + env.SCHEDULED_RIDE_ACTIVATION_LEAD_MIN * 60 * 1000);
  const dueRides = await prisma.ride.findMany({
    where: { status: 'SCHEDULED', scheduledFor: { lte: cutoff } },
  });

  for (const ride of dueRides) {
    const { count } = await prisma.ride.updateMany({
      where: { id: ride.id, status: 'SCHEDULED' },
      data: { status: 'REQUESTED', requestedAt: new Date() },
    });
    if (count === 0) continue;

    const activated = await prisma.ride.findUnique({ where: { id: ride.id }, include: RIDE_INCLUDE });
    // Retry-safety net: usually already set from scheduleRide's own
    // enrichment call, but doesn't hurt to retry here in case that first
    // attempt hit a flaky Nominatim response.
    if (!activated.pickupAddressAr || !activated.destinationAddressAr) {
      enrichRideAddressesInArabic(activated);
    }
    await broadcastToNearbyDrivers(activated);
  }
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

// Creates (once) or returns the existing public tracking token for this
// ride, so repeated taps on "share" reuse the same link instead of
// invalidating whatever the client already sent to someone.
async function getOrCreateShareToken(rideId, userId) {
  const ride = await getRideById(userId, rideId);
  if (!ACTIVE_STATUSES.includes(ride.status)) {
    throw new AppError('Ride is not active', 409, 'RIDE_NOT_ACTIVE');
  }
  if (ride.shareToken) {
    return { token: ride.shareToken };
  }
  const token = crypto.randomBytes(16).toString('hex');
  await prisma.ride.update({ where: { id: rideId }, data: { shareToken: token } });
  return { token };
}

// Deliberately returns only what an outside, unauthenticated viewer needs to
// watch the vehicle approach - no phone numbers, no client identity at all.
async function getPublicTrackingView(token) {
  const ride = await prisma.ride.findUnique({
    where: { shareToken: token },
    select: {
      status: true,
      pickupLat: true,
      pickupLng: true,
      pickupAddress: true,
      destinationLat: true,
      destinationLng: true,
      destinationAddress: true,
      driver: { select: { fullName: true, vehicleModel: true, vehiclePlate: true, currentLat: true, currentLng: true } },
    },
  });
  if (!ride) {
    throw new AppError('Tracking link not found', 404, 'NOT_FOUND');
  }
  if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
    throw new AppError('This ride has ended', 410, 'RIDE_ENDED');
  }
  return {
    status: ride.status,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    pickupAddress: ride.pickupAddress,
    destinationLat: ride.destinationLat,
    destinationLng: ride.destinationLng,
    destinationAddress: ride.destinationAddress,
    driverName: ride.driver?.fullName || null,
    vehicleModel: ride.driver?.vehicleModel || null,
    vehiclePlate: ride.driver?.vehiclePlate || null,
    driverLat: ride.driver?.currentLat ?? null,
    driverLng: ride.driver?.currentLng ?? null,
  };
}

async function listRides(userId) {
  return prisma.ride.findMany({
    where: {
      // SCHEDULED rides live in their own "upcoming reservations" list
      // (listScheduledRides) until they activate or get cancelled.
      status: { not: 'SCHEDULED' },
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
  // Defense in depth: `updateAvailability` already stops an unapproved driver
  // from ever going online, but this closes the gap for a direct API call.
  const driver = await prisma.user.findUnique({ where: { id: driverId } });
  if (driver.approvalStatus !== 'APPROVED') {
    throw new AppError('Your driver account is not yet approved', 403, 'FORBIDDEN');
  }
  const minBalance = await getMinBalanceToGoOnline();
  if (driver.creditBalance < minBalance) {
    throw new AppError(`You need at least ${minBalance} in your balance to accept rides`, 403, 'FORBIDDEN');
  }
  assertNotAutoSuspended(driver);

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
  emitToUser(ride.clientId, 'ride:accepted', ride);
  sendPushToUser(ride.clientId, { title: 'Driver on the way', body: `${ride.driver.fullName} accepted your ride`, data: { rideId: ride.id, type: 'ride:accepted' } });
  return ride;
}

// A decline is per-driver, not a ride-wide state change: the ride stays
// REQUESTED so any other driver it was broadcast to can still accept it.
// Idempotent - re-declining an already-declined ride is a silent no-op.
async function declineRide(driverId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.status !== 'REQUESTED') {
    throw new AppError('This ride is no longer awaiting a driver', 409, 'CONFLICT');
  }

  if (!ride.declinedByDriverIds.includes(driverId)) {
    await prisma.ride.update({
      where: { id: rideId },
      data: { declinedByDriverIds: { push: driverId } },
    });
  }

  return { id: ride.id };
}

// On ride completion: first spend any existing credit balance toward this
// ride's cash payment (Ride.creditApplied), then - if this is the client's
// first-ever completed ride and they were referred - grant a one-time
// referral reward to both sides, available starting from their *next* ride.
async function applyCreditAndReferralReward(ride) {
  const client = await prisma.user.findUnique({ where: { id: ride.clientId } });
  if (!client) return ride;

  let updatedRide = ride;

  if (client.creditBalance > 0 && ride.estimatedFare) {
    const creditApplied = Math.min(client.creditBalance, ride.estimatedFare);
    await prisma.$transaction([
      prisma.user.update({ where: { id: client.id }, data: { creditBalance: { decrement: creditApplied } } }),
      prisma.ride.update({ where: { id: ride.id }, data: { creditApplied } }),
    ]);
    updatedRide = await prisma.ride.findUnique({ where: { id: ride.id }, include: RIDE_INCLUDE });
  }

  if (client.referredById && !client.referralRewardGrantedAt) {
    const completedCount = await prisma.ride.count({ where: { clientId: client.id, status: 'COMPLETED' } });
    if (completedCount === 1) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: client.id },
          data: { creditBalance: { increment: env.REFERRAL_REWARD_AMOUNT }, referralRewardGrantedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: client.referredById },
          data: { creditBalance: { increment: env.REFERRAL_REWARD_AMOUNT } },
        }),
      ]);
      sendPushToUser(client.id, {
        title: 'Referral bonus!',
        body: `You've earned ${env.REFERRAL_REWARD_AMOUNT} credit toward your next ride`,
        data: { type: 'referral:reward' },
      });
      sendPushToUser(client.referredById, {
        title: 'Referral bonus!',
        body: `Your friend took their first ride - you've earned ${env.REFERRAL_REWARD_AMOUNT} credit`,
        data: { type: 'referral:reward' },
      });
    }
  }

  return updatedRide;
}

// Frozen at the moment a ride completes, using the driver's commissionRate
// AT THAT MOMENT - a later rate change (see admin.service.js#setCommissionRate,
// which logs to CommissionChange) must never retroactively alter an
// already-completed ride. Computed on the full estimatedFare, not
// fare-minus-creditApplied: referral credit is a cost the company already
// absorbed when it funded the referral program, so it shouldn't also shrink
// the driver's commission base. Must run before applyCreditAndReferralReward
// for that reason (that function's own re-fetch of the ride then naturally
// picks up these fields).
async function snapshotCommission(ride) {
  const driver = await prisma.user.findUnique({ where: { id: ride.driverId }, select: { commissionRate: true } });
  const rate = driver?.commissionRate ?? (await getDefaultCommissionRate());
  const fare = ride.estimatedFare || 0;
  const commissionAmount = Math.round(fare * rate * 100) / 100;
  const driverNetAmount = Math.round((fare - commissionAmount) * 100) / 100;

  return prisma.ride.update({
    where: { id: ride.id },
    data: { commissionRateSnapshot: rate, commissionAmount, driverNetAmount },
    include: RIDE_INCLUDE,
  });
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

  let ride = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
  if (to === 'COMPLETED') {
    ride = await snapshotCommission(ride);
    ride = await applyCreditAndReferralReward(ride);
    // A normal completion breaks any streak of consecutive cancellations -
    // see cancelRide, which is the only place cancelStreak is incremented.
    await prisma.user.update({ where: { id: ride.driverId }, data: { cancelStreak: 0 } });
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
    where: { id: rideId, status: { in: BOOKED_STATUSES } },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: role, cancellationReason: reason },
  });

  if (count === 0) {
    throw new AppError('This ride can no longer be cancelled', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });

  if (role === 'DRIVER') {
    const driver = await prisma.user.update({
      where: { id: userId },
      data: { cancelStreak: { increment: 1 } },
    });
    if (driver.cancelStreak >= AUTO_SUSPEND_CANCEL_THRESHOLD) {
      const hours = await getDriverAutoSuspendHours();
      await prisma.user.update({
        where: { id: userId },
        data: { cancelStreak: 0, autoSuspendedUntil: new Date(Date.now() + hours * 3600000) },
      });
    }
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
// cash in person. No amount/method to record - just the one flag. Mobile-
// money methods go through declareRidePaidByClient/confirmRidePaymentReceived
// below instead, since (unlike cash) there's a client-side step to confirm
// too.
async function markRidePaid(driverId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.driverId !== driverId) {
    throw new AppError('You are not the driver for this ride', 403, 'FORBIDDEN');
  }
  if (ride.paymentMethod !== 'CASH') {
    throw new AppError('This ride is not paid by cash', 409, 'CONFLICT');
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

// Step 1 of the mobile-money flow (Bankily/Sedad/Masrivi/Click/Bimbank): none
// of these Mauritanian apps expose a payment gateway API (researched - closed
// banking systems, no public merchant integration), so the client transfers
// directly to the driver's phone/mobile-money account outside this app, then
// taps "J'ai payé" here to let the driver know. isPaid/paidAt aren't set yet -
// that only happens once the driver confirms receipt (see
// confirmRidePaymentReceived below), so a client mistakenly/falsely declaring
// payment can't unilaterally mark a ride paid.
async function declareRidePaidByClient(clientId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.clientId !== clientId) {
    throw new AppError('You are not the client for this ride', 403, 'FORBIDDEN');
  }
  if (!MOBILE_MONEY_METHODS.includes(ride.paymentMethod)) {
    throw new AppError('This ride is not paid by mobile money', 409, 'CONFLICT');
  }
  if (ride.status !== 'COMPLETED') {
    throw new AppError('A ride can only be declared paid once it is completed', 409, 'CONFLICT');
  }
  if (ride.isPaid) {
    throw new AppError('This ride is already marked as paid', 409, 'CONFLICT');
  }
  if (ride.clientMarkedPaidAt) {
    throw new AppError('You have already declared this ride as paid', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { clientMarkedPaidAt: new Date() },
    include: RIDE_INCLUDE,
  });

  emitRideStatus(updated);
  sendPushToUser(updated.driverId, {
    title: 'Paiement déclaré',
    body: `${updated.client.fullName} affirme avoir payé par ${updated.paymentMethod}. Vérifiez et confirmez la réception.`,
    data: { rideId: updated.id, type: 'ride:payment' },
  });
  return updated;
}

// Step 2: the driver confirms the mobile-money transfer actually arrived -
// only then does isPaid/paidAt flip, mirroring what markRidePaid does for
// CASH. Requires the client to have declared first (see
// declareRidePaidByClient) rather than letting the driver confirm
// proactively, so this always reflects an explicit two-sided exchange.
async function confirmRidePaymentReceived(driverId, rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.driverId !== driverId) {
    throw new AppError('You are not the driver for this ride', 403, 'FORBIDDEN');
  }
  if (!MOBILE_MONEY_METHODS.includes(ride.paymentMethod)) {
    throw new AppError('This ride is not paid by mobile money', 409, 'CONFLICT');
  }
  if (ride.status !== 'COMPLETED') {
    throw new AppError('A ride can only be confirmed paid once it is completed', 409, 'CONFLICT');
  }
  if (ride.isPaid) {
    throw new AppError('This ride is already marked as paid', 409, 'CONFLICT');
  }
  if (!ride.clientMarkedPaidAt) {
    throw new AppError('The client has not declared payment yet', 409, 'CONFLICT');
  }

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { isPaid: true, paidAt: new Date() },
    include: RIDE_INCLUDE,
  });

  emitRideStatus(updated);
  sendPushToUser(updated.clientId, {
    title: 'Paiement confirmé',
    body: 'Le chauffeur a confirmé la réception de votre paiement.',
    data: { rideId: updated.id, type: 'ride:payment' },
  });
  return updated;
}

// CARD-only: starts a Stripe Checkout Session for the client to pay online.
// Unlike markRidePaid (CASH), the driver has nothing to confirm here - the
// webhook (markRidePaidFromStripe) is the only thing that ever flips isPaid.
async function createCardCheckoutSession(clientId, rideId, { successUrl, cancelUrl }) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  if (ride.clientId !== clientId) {
    throw new AppError('Only the client can pay for this ride', 403, 'FORBIDDEN');
  }
  if (ride.paymentMethod !== 'CARD') {
    throw new AppError('This ride is not set up for card payment', 409, 'CONFLICT');
  }
  if (ride.status !== 'COMPLETED') {
    throw new AppError('A ride can only be paid once it is completed', 409, 'CONFLICT');
  }
  if (ride.isPaid) {
    throw new AppError('This ride is already paid', 409, 'CONFLICT');
  }

  const session = await paymentService.createCheckoutSession(ride, { successUrl, cancelUrl });
  await prisma.ride.update({ where: { id: rideId }, data: { stripeCheckoutSessionId: session.id } });
  return session.url;
}

// Idempotent - Stripe may redeliver the same webhook event more than once, so
// a ride that's already paid (or no longer exists) is silently a no-op.
async function markRidePaidFromStripe(rideId, paymentIntentId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId } });
  if (!ride || ride.isPaid) return;

  const updated = await prisma.ride.update({
    where: { id: rideId },
    data: { isPaid: true, paidAt: new Date(), stripePaymentIntentId: paymentIntentId },
    include: RIDE_INCLUDE,
  });

  // So both sides' screens reflect it live, reusing the same event every
  // other status change already broadcasts on.
  emitRideStatus(updated);
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

// Admin-facing: no participant check (admin sees every ride), paginated
// since ride volume grows unbounded over time (unlike the small, unpaginated
// driver/vehicle/client admin lists).
async function adminListRides({ driverId, clientId, status, paymentMethod, from, to, page, pageSize }) {
  const pageNum = page || 1;
  const pageSizeNum = pageSize || 20;
  const where = {
    ...(driverId && { driverId }),
    ...(clientId && { clientId }),
    ...(status && { status }),
    ...(paymentMethod && { paymentMethod }),
    ...((from || to) && {
      requestedAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) },
    }),
  };

  const [total, rides] = await Promise.all([
    prisma.ride.count({ where }),
    prisma.ride.findMany({
      where,
      include: RIDE_INCLUDE,
      orderBy: { requestedAt: 'desc' },
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    }),
  ]);

  return { rides, total, page: pageNum, pageSize: pageSizeNum, totalPages: Math.ceil(total / pageSizeNum) };
}

async function adminGetRideById(rideId) {
  const ride = await prisma.ride.findUnique({ where: { id: rideId }, include: RIDE_INCLUDE });
  if (!ride) {
    throw new AppError('Ride not found', 404, 'NOT_FOUND');
  }
  return ride;
}

async function getStats(userId, role) {
  const field = role === 'DRIVER' ? 'driverId' : 'clientId';
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // No week-start convention exists elsewhere in this app - Monday, plain
  // local-time Date, no timezone handling (mirrors startOfMonth above).
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() + (day === 0 ? -6 : 1 - day));
  startOfWeek.setHours(0, 0, 0, 0);

  const [completedAgg, ridesThisMonth, dayAgg, weekAgg, driverExtras] = await Promise.all([
    prisma.ride.aggregate({
      where: { [field]: userId, status: 'COMPLETED' },
      _count: { _all: true },
      _sum: { estimatedFare: true },
    }),
    prisma.ride.count({
      where: { [field]: userId, status: 'COMPLETED', completedAt: { gte: startOfMonth } },
    }),
    prisma.ride.aggregate({
      where: { [field]: userId, status: 'COMPLETED', completedAt: { gte: startOfDay } },
      _sum: { estimatedFare: true },
    }),
    prisma.ride.aggregate({
      where: { [field]: userId, status: 'COMPLETED', completedAt: { gte: startOfWeek } },
      _sum: { estimatedFare: true },
    }),
    role === 'DRIVER'
      ? Promise.all([
          // driverId is only ever set via acceptRide, so this is "times this
          // driver accepted" - any status, not just COMPLETED.
          prisma.ride.count({ where: { driverId: userId } }),
          prisma.ride.count({ where: { driverId: userId, cancelledBy: 'DRIVER' } }),
          prisma.ride.count({ where: { declinedByDriverIds: { has: userId } } }),
          prisma.user.findUnique({
            where: { id: userId },
            select: { ratingAverage: true, ratingCount: true, weeklyRevenueGoal: true },
          }),
        ])
      : Promise.resolve(null),
  ]);

  const stats = {
    completedRides: completedAgg._count._all,
    totalAmount: completedAgg._sum.estimatedFare || 0,
    ridesThisMonth,
    dailyAmount: dayAgg._sum.estimatedFare || 0,
    weeklyAmount: weekAgg._sum.estimatedFare || 0,
  };

  if (driverExtras) {
    const [totalAssigned, driverCancelled, declinedCount, userExtra] = driverExtras;
    stats.acceptanceRate = totalAssigned + declinedCount > 0 ? totalAssigned / (totalAssigned + declinedCount) : null;
    stats.cancellationRate = totalAssigned > 0 ? driverCancelled / totalAssigned : null;
    stats.ratingAverage = userExtra?.ratingAverage ?? null;
    stats.ratingCount = userExtra?.ratingCount ?? 0;
    stats.weeklyRevenueGoal = userExtra?.weeklyRevenueGoal ?? null;
  }

  return stats;
}

// Buckets currently-searching rides by nearest district center (no polygon
// boundary data exists for Nouakchott's moughataas, so nearest-center is the
// Voronoi-style approximation of "which district") - see
// src/config/demandZones.js for how those centers were sourced.
async function getDemandZones() {
  const pendingRides = await prisma.ride.findMany({
    where: { status: 'REQUESTED' },
    select: { pickupLat: true, pickupLng: true },
  });

  const zones = DEMAND_ZONES.map((zone) => ({ name: zone.name, lat: zone.lat, lng: zone.lng, count: 0 }));

  for (const ride of pendingRides) {
    let nearest = zones[0];
    let nearestDist = haversineDistanceKm(ride.pickupLat, ride.pickupLng, nearest.lat, nearest.lng);
    for (let i = 1; i < zones.length; i++) {
      const dist = haversineDistanceKm(ride.pickupLat, ride.pickupLng, zones[i].lat, zones[i].lng);
      if (dist < nearestDist) {
        nearest = zones[i];
        nearestDist = dist;
      }
    }
    nearest.count += 1;
  }

  return zones.map(({ name, count }) => ({ name, count })).sort((a, b) => b.count - a.count);
}

// Replaces the old Socket.io 'location:update' handler now that the backend
// is stateless (see lib/realtime.js) - the in-memory rideTracker Map it used
// to consult is gone, so the driver's active ride is looked up straight from
// the DB instead (cheap enough at this app's driver volume/ping cadence).
async function updateDriverLocation(driverId, lat, lng) {
  await prisma.user.update({
    where: { id: driverId },
    data: { currentLat: lat, currentLng: lng, lastLocationUpdatedAt: new Date() },
  });

  const activeRide = await prisma.ride.findFirst({
    where: { driverId, status: { in: ACTIVE_STATUSES } },
    select: { id: true, clientId: true },
  });
  if (activeRide) {
    emitToUser(activeRide.clientId, 'driver:location', { rideId: activeRide.id, lat, lng });
  }
}

// Mirrors updateDriverLocation above - a still-REQUESTED ride has no driverId
// yet, so this just stores the position and no-ops the emit (nothing to
// notify until someone accepts).
async function updateClientLocation(clientId, lat, lng) {
  await prisma.user.update({
    where: { id: clientId },
    data: { currentLat: lat, currentLng: lng, lastLocationUpdatedAt: new Date() },
  });

  const activeRide = await prisma.ride.findFirst({
    where: { clientId, status: { in: ACTIVE_STATUSES } },
    select: { id: true, driverId: true },
  });
  if (activeRide?.driverId) {
    emitToUser(activeRide.driverId, 'client:location', { rideId: activeRide.id, lat, lng });
  }
}

module.exports = {
  computeRouteAndFare,
  updateDriverLocation,
  requestRide,
  scheduleRide,
  listScheduledRides,
  activateScheduledRides,
  getRideById,
  listRides,
  getActiveRide,
  acceptRide,
  declineRide,
  arriveRide: (driverId, rideId) => transitionRide(driverId, rideId, 'arrive'),
  startRide: (driverId, rideId) => transitionRide(driverId, rideId, 'start'),
  completeRide: (driverId, rideId) => transitionRide(driverId, rideId, 'complete'),
  cancelRide,
  rateRide,
  markRidePaid,
  declareRidePaidByClient,
  confirmRidePaymentReceived,
  createCardCheckoutSession,
  markRidePaidFromStripe,
  hideRideFromHistory,
  getStats,
  adminListRides,
  adminGetRideById,
  ACTIVE_STATUSES,
  assertNotAutoSuspended,
  getOrCreateShareToken,
  getPublicTrackingView,
  getDemandZones,
  updateClientLocation,
};
