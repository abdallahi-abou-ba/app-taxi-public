const rateLimit = require('express-rate-limit');
const { sendError } = require('../utils/apiResponse');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, { message: 'Too many attempts, please try again later', code: 'RATE_LIMITED', status: 429 });
  },
});

module.exports = { authRateLimiter };
