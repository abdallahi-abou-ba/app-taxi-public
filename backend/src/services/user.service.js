const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { toPublicUser } = require('./auth.service');
const { ACTIVE_STATUSES } = require('./ride.service');

const SALT_ROUNDS = 10;

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

// Anonymizes rather than hard-deletes: existing rides keep a valid clientId/
// driverId so the counterpart's history still resolves, just showing
// "Deleted user" instead of a 404 or a dangling foreign key.
async function deleteAccount(userId, password) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Incorrect password', 401, 'UNAUTHORIZED');
  }

  const hasActiveRide = await prisma.ride.findFirst({
    where: { status: { in: ACTIVE_STATUSES }, OR: [{ clientId: userId }, { driverId: userId }] },
  });
  if (hasActiveRide) {
    throw new AppError('You cannot delete your account while you have an active ride', 409, 'CONFLICT');
  }

  const unusablePassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.local`,
        passwordHash: unusablePassword,
        fullName: 'Deleted user',
        phone: null,
        pushToken: null,
        isAvailable: user.role === 'DRIVER' ? false : null,
        currentLat: null,
        currentLng: null,
        deletedAt: new Date(),
      },
    }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
}

module.exports = { updateProfile, updateAvailability, updatePushToken, deleteAccount };
