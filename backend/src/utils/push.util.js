const { Expo } = require('expo-server-sdk');
const prisma = require('../lib/prisma');
const logger = require('../config/logger');

const expo = new Expo();

/**
 * Best-effort push notification, never throws - a failure here should never
 * break the ride action that triggered it (mirrors utils/osrm.util.js).
 */
async function sendPushToUser(userId, { title, body, data } = {}) {
  if (!userId) return;

  try {
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
