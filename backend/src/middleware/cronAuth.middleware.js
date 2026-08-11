const AppError = require('../utils/appError');
const env = require('../config/env');

// Replaces the old in-process setInterval jobs (see jobs/reminder.job.js,
// jobs/scheduling.job.js), which have no equivalent on serverless - an
// external pinger (cron-job.org) hits these endpoints on a schedule instead,
// authenticated with a shared secret since they're otherwise unauthenticated.
function requireCronSecret(req, res, next) {
  if (req.headers['x-cron-secret'] !== env.CRON_SECRET) {
    throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
  }
  next();
}

module.exports = { requireCronSecret };
