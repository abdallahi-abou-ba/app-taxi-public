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

// Covers the public, unauthenticated /track/:token page and its polling
// endpoint - kept separate from authRateLimiter so it can't eat into (or be
// eaten into by) the auth-test budget that limiter is tuned around.
const shareViewRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, { message: 'Too many requests, please try again later', code: 'RATE_LIMITED', status: 429 });
  },
});

module.exports = { authRateLimiter, shareViewRateLimiter };
