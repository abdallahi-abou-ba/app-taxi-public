const prisma = require('../lib/prisma');
const logger = require('../config/logger');
const notificationService = require('../services/notification.service');
const { safeWaitUntil } = require('../lib/waitUntil');

// expo-server-sdk publishes as an ES module - require() of it crashes on
// Vercel's Node runtime (works locally only because an older cached install
// happened to still be CommonJS). Load it lazily via dynamic import instead.
let expoSingleton;
async function getExpo() {
  if (!expoSingleton) {
    const { Expo } = await import('expo-server-sdk');
    expoSingleton = { Expo, expo: new Expo() };
  }
  return expoSingleton;
}

/**
 * Best-effort push notification, never throws - a failure here should never
 * break the ride action that triggered it (mirrors utils/osrm.util.js).
 * Callers deliberately don't await this (ride.service.js, jobs/*) - on
 * Vercel the function can freeze right after the response is sent, so the
 * work is registered with waitUntil() here rather than at every call site.
 */
function sendPushToUser(userId, { title, body, data } = {}) {
  return safeWaitUntil(doSendPushToUser(userId, { title, body, data }));
}

async function doSendPushToUser(userId, { title, body, data } = {}) {
  if (!userId) return;

  // Persisted independently of whether an Expo push actually goes out (no
  // token, stale token, notifications permission denied, etc.) - this is what
  // backs the mobile app's in-app "Notifications" screen/history.
  notificationService
    .createNotification(userId, { type: data?.type || 'general', title, body, data })
    .catch((err) => logger.warn(`Notification persist for user ${userId} failed: ${err.message}`));

  try {
    const { Expo, expo } = await getExpo();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
    const token = user?.pushToken;
    if (!token || !Expo.isExpoPushToken(token)) return;

    const [ticket] = await expo.sendPushNotificationsAsync([{ to: token, sound: 'default', title, body, data }]);
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      await prisma.user.update({ where: { id: userId }, data: { pushToken: null } }).catch(() => {});
    }
  } catch (err) {
    logger.warn(`Push notification to user ${userId} failed: ${err.message}`);
  }
}

// Bulk send (promo broadcasts, see scripts/send-promo.js) - chunked via Expo's
// own batching so a broadcast to many users doesn't blow past its per-request
// limits, with the same DeviceNotRegistered cleanup as the single-user path.
async function sendPushToTokens(tokens, { title, body, data } = {}) {
  const { Expo, expo } = await getExpo();
  const validTokens = tokens.filter((token) => token && Expo.isExpoPushToken(token));
  if (validTokens.length === 0) return { sent: 0, invalid: 0 };

  const messages = validTokens.map((to) => ({ to, sound: 'default', title, body, data }));
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
    } catch (err) {
      logger.warn(`Push broadcast chunk failed: ${err.message}`);
      tickets.push(...chunk.map(() => null));
    }
  }

  const staleTokens = validTokens.filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered');
  if (staleTokens.length > 0) {
    await prisma.user.updateMany({ where: { pushToken: { in: staleTokens } }, data: { pushToken: null } }).catch(() => {});
  }

  return { sent: tickets.filter((t) => t?.status === 'ok').length, invalid: staleTokens.length };
}

module.exports = { sendPushToUser, sendPushToTokens };
