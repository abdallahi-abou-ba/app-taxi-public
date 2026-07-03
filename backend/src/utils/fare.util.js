const env = require('../config/env');

/** Simple linear fare model: base + per-km + per-minute. */
function estimateFare(distanceKm, durationMin) {
  const fare = env.BASE_FARE + distanceKm * env.RATE_PER_KM + durationMin * env.RATE_PER_MIN;
  return Math.round(fare * 100) / 100;
}

module.exports = { estimateFare };
