const { waitUntil } = require('@vercel/functions');

// Fire-and-forget calls (push notifications, geocoding, realtime publishes)
// used to be safe on Railway's persistent process - the event loop kept
// running regardless. On Vercel, the function can freeze the moment the
// response is sent, so an un-awaited promise isn't guaranteed to finish.
// waitUntil() only works inside an active Vercel invocation though - it
// throws in local dev, Jest, and one-off scripts (send-promo.js), where the
// promise still completes fine on its own via Node's normal event loop.
function safeWaitUntil(promise) {
  try {
    waitUntil(promise);
  } catch {
    // no active Vercel invocation context - let it run normally
  }
  return promise;
}

module.exports = { safeWaitUntil };
