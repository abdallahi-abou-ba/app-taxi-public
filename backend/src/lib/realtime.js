const Ably = require('ably');
const env = require('../config/env');
const logger = require('../config/logger');
const { safeWaitUntil } = require('./waitUntil');

// Rest (not Realtime) is deliberate: it's a stateless HTTP client with
// nothing to keep connected between invocations - the right shape now that
// the backend is a set of stateless Vercel functions instead of the one
// persistent process that used to hold the Socket.io server open.
let restClient = null;
function getAbly() {
  if (!restClient) restClient = new Ably.Rest({ key: env.ABLY_API_KEY });
  return restClient;
}

// Every user has their own private channel; mobile clients subscribe to
// theirs via a token scoped to it by GET /api/realtime/token (see
// controllers/realtime.controller.js). Fire-and-forget by design, matching
// the old getIO().to(room).emit() call sites it replaces - safeWaitUntil
// keeps the publish alive past the response being sent.
function publishToUser(userId, event, payload) {
  if (!userId) return;
  const channel = getAbly().channels.get(`user:${userId}`);
  safeWaitUntil(channel.publish(event, payload).catch((err) => logger.warn(`Ably publish to user ${userId} failed: ${err.message}`)));
}

module.exports = { getAbly, publishToUser };
