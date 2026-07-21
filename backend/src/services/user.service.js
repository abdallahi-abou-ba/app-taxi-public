const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const AppError = require('../utils/appError');
const { toPublicUser } = require('./auth.service');
const { ACTIVE_STATUSES } = require('./ride.service');
const phoneOtpService = require('./phoneOtp.service');
const appSettingService = require('./appSetting.service');

const SALT_ROUNDS = 10;

async function updateProfile(userId, updates) {
  const user = await prisma.user.update({ where: { id: userId }, data: updates });
  return toPublicUser(user);
}

async function updateAvailability(requester, { isAvailable, currentLat, currentLng }) {
  if (requester.role !== 'DRIVER') {
    throw new AppError('Only drivers have an availability status', 403, 'FORBIDDEN');
  }
  if (isAvailable && requester.approvalStatus !== 'APPROVED') {
    throw new AppError('Your driver account is not yet approved', 403, 'FORBIDDEN');
  }
  if (isAvailable) {
    const minBalance = await appSettingService.getMinBalanceToGoOnline();
    if (requester.creditBalance < minBalance) {
      throw new AppError(`You need at least ${minBalance} in your balance to go online`, 403, 'FORBIDDEN');
    }
  }

  const data = { isAvailable };
  if (currentLat !== undefined && currentLng !== undefined) {
    data.currentLat = currentLat;
    data.currentLng = currentLng;
    data.lastLocationUpdatedAt = new Date();
  }

  const user = await prisma.user.update({ where: { id: requester.id }, data });
  return toPublicUser(user);
}

async function updatePushToken(userId, pushToken) {
  const user = await prisma.user.update({ where: { id: userId }, data: { pushToken } });
  return toPublicUser(user);
}

// Anonymizes rather than hard-deletes: existing rides keep a valid clientId/
// driverId so the counterpart's history still resolves, just showing
// "Deleted user" instead of a 404 or a dangling foreign key.
async function deleteAccount(userId, { password, otpCode }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  // Two confirmation paths depending on how this account authenticates: a
  // legacy/email account confirms with its password (as before); a
  // phone+OTP account (passwordHash null) has no password to check, so it
  // confirms with a freshly-verified OTP code instead.
  if (user.passwordHash) {
    if (!password) {
      throw new AppError('Password is required', 422, 'VALIDATION_ERROR');
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError('Incorrect password', 401, 'UNAUTHORIZED');
    }
  } else {
    if (!otpCode || !user.phone) {
      throw new AppError('A verification code is required', 422, 'VALIDATION_ERROR');
    }
    await phoneOtpService.verifyAndConsumeOtp(user.phone, otpCode);
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

async function requestPhoneOtp(phone) {
  return phoneOtpService.requestOtp(phone);
}

// Attaches/changes the caller's own phone number once the OTP for it has
// been verified - used both by an existing email account adding a phone for
// the first time (the login bridge) and by anyone changing an already-set
// phone. P2002 (another account already owns this number) is translated to a
// 409 by the global error middleware, so no explicit catch is needed here.
async function verifyAndSetPhone(userId, phone, code) {
  const normalizedPhone = await phoneOtpService.verifyAndConsumeOtp(phone, code);
  const user = await prisma.user.update({ where: { id: userId }, data: { phone: normalizedPhone } });
  return toPublicUser(user);
}

async function getReferralInfo(userId) {
  const [user, referralCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true, creditBalance: true } }),
    prisma.user.count({ where: { referredById: userId } }),
  ]);

  return { referralCode: user.referralCode, creditBalance: user.creditBalance, referralCount };
}

module.exports = {
  updateProfile,
  updateAvailability,
  updatePushToken,
  deleteAccount,
  requestPhoneOtp,
  verifyAndSetPhone,
  getReferralInfo,
};
