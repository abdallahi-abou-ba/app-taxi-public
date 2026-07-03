const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { toPublicUser } = require('./auth.service');

async function updateProfile(userId, updates) {
  const user = await prisma.user.update({ where: { id: userId }, data: updates });
  return toPublicUser(user);
}

async function updateAvailability(userId, role, { isAvailable, currentLat, currentLng }) {
  if (role !== 'DRIVER') {
    throw new AppError('Only drivers have an availability status', 403, 'FORBIDDEN');
  }

  const data = { isAvailable };
  if (currentLat !== undefined && currentLng !== undefined) {
    data.currentLat = currentLat;
    data.currentLng = currentLng;
    data.lastLocationUpdatedAt = new Date();
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  return toPublicUser(user);
}

async function updatePushToken(userId, pushToken) {
  const user = await prisma.user.update({ where: { id: userId }, data: { pushToken } });
  return toPublicUser(user);
}

module.exports = { updateProfile, updateAvailability, updatePushToken };
