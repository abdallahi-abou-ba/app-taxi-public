const logger = require('../config/logger');
const rideService = require('../services/ride.service');

async function runSchedulingCheck() {
  try {
    await rideService.activateScheduledRides();
  } catch (err) {
    logger.warn(`Scheduled ride activation check failed: ${err.message}`);
  }
}

module.exports = { runSchedulingCheck };
