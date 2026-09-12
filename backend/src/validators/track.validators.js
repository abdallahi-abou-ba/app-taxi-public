const { z } = require('zod');

// Matches crypto.randomBytes(16).toString('hex') from ride.service.js#getOrCreateShareToken.
const trackTokenParamSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{32}$/, 'Invalid tracking token'),
});

module.exports = { trackTokenParamSchema };
