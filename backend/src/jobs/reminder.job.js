const prisma = require('../lib/prisma');
const env = require('../config/env');
const logger = require('../config/logger');
const { sendPushToUser } = require('../utils/push.util');

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

// A ride still stuck in REQUESTED after this long gets the client a one-time
// nudge (they can keep waiting or cancel and try again).
async function remindStillSearching() {
  const cutoff = new Date(Date.now() - env.SEARCH_REMINDER_AFTER_MIN * MINUTE_MS);
  const rides = await prisma.ride.findMany({
    where: { status: 'REQUESTED', requestedAt: { lte: cutoff }, searchReminderSentAt: null },
    select: { id: true, clientId: true },
  });

  for (const ride of rides) {
    sendPushToUser(ride.clientId, {
      title: 'Still looking for a driver',
      body: 'No driver has accepted yet - you can keep waiting or cancel and try again.',
      data: { rideId: ride.id, type: 'ride:search-reminder' },
    });
  }

  if (rides.length > 0) {
    await prisma.ride.updateMany({
      where: { id: { in: rides.map((r) => r.id) } },
      data: { searchReminderSentAt: new Date() },
    });
  }
}

// A COMPLETED ride missing a rating from either side gets a one-time nudge to
// whichever side hasn't rated yet, once enough time has passed to give them a
// fair chance to do it unprompted first.
async function remindUnratedRides() {
  const cutoff = new Date(Date.now() - env.RATING_REMINDER_AFTER_HOURS * HOUR_MS);
  const rides = await prisma.ride.findMany({
    where: {
      status: 'COMPLETED',
      completedAt: { lte: cutoff },
      ratingReminderSentAt: null,
      OR: [{ driverRating: null }, { clientRating: null }],
    },
    select: { id: true, clientId: true, driverId: true, driverRating: true, clientRating: true },
  });

  for (const ride of rides) {
    if (ride.driverRating == null) {
      sendPushToUser(ride.clientId, {
        title: 'Rate your ride',
        body: "Don't forget to rate your driver.",
        data: { rideId: ride.id, type: 'ride:rating-reminder' },
      });
    }
    if (ride.clientRating == null && ride.driverId) {
      sendPushToUser(ride.driverId, {
        title: 'Rate your ride',
        body: "Don't forget to rate your client.",
        data: { rideId: ride.id, type: 'ride:rating-reminder' },
      });
    }
  }

  if (rides.length > 0) {
    await prisma.ride.updateMany({
      where: { id: { in: rides.map((r) => r.id) } },
      data: { ratingReminderSentAt: new Date() },
    });
  }
}

async function runReminderChecks() {
  try {
    await remindStillSearching();
  } catch (err) {
    logger.warn(`Search reminder check failed: ${err.message}`);
  }
  try {
    await remindUnratedRides();
  } catch (err) {
    logger.warn(`Rating reminder check failed: ${err.message}`);
  }
}

function startReminderJob() {
  runReminderChecks();
  return setInterval(runReminderChecks, env.REMINDER_CHECK_INTERVAL_MIN * MINUTE_MS);
}

module.exports = { startReminderJob, runReminderChecks, remindStillSearching, remindUnratedRides };
