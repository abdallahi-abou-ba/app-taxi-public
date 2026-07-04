const env = require('../config/env');
const logger = require('../config/logger');
const rideService = require('../services/ride.service');

async function runSchedulingCheck() {
  try {
    await rideService.activateScheduledRides();
  } catch (err) {
    logger.warn(`Scheduled ride activation check failed: ${err.message}`);
  }
}

function startSchedulingJob() {
  runSchedulingCheck();
  return setInterval(runSchedulingCheck, env.SCHEDULING_CHECK_INTERVAL_MIN * 60 * 1000);
}

module.exports = { startSchedulingJob, runSchedulingCheck };
