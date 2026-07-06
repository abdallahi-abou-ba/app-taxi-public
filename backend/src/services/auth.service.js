const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { generateUniqueReferralCode } = require('../utils/referral.util');

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 48;

function toPublicUser(user) {
  const { passwordHash, pushToken, ...publicUser } = user; // eslint-disable-line no-unused-vars
  return publicUser;
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

// Refresh tokens are stored hashed (like passwords), never in plaintext, so a
// leaked DB doesn't hand out usable tokens.
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueTokens(user) {
  const accessToken = signToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hashRefreshToken(refreshToken), expiresAt },
  });

  return { accessToken, refreshToken };
}

async function register({ email, password, fullName, phone, role, referralCode, vehiclePlate, vehicleModel }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'CONFLICT');
  }

  let referredById = null;
  if (referralCode) {
    const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.trim().toUpperCase() } });
    if (!referrer) {
      throw new AppError('Referral code not found', 422, 'VALIDATION_ERROR');
    }
    referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const myReferralCode = await generateUniqueReferralCode();

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      phone,
      role,
      isAvailable: role === 'DRIVER' ? false : null,
      vehiclePlate: role === 'DRIVER' ? vehiclePlate : undefined,
      vehicleModel: role === 'DRIVER' ? vehicleModel : undefined,
      approvalStatus: role === 'DRIVER' ? 'PENDING' : null,
      referralCode: myReferralCode,
      referredById,
    },
  });

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

// Rotates the refresh token on every use: the presented token is revoked and a
// new access/refresh pair is issued, so a stolen-but-unused token stops working
// the moment the legitimate client refreshes.
async function refresh(rawRefreshToken) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  return { user: toPublicUser(stored.user), ...(await issueTokens(stored.user)) };
}

async function logout(rawRefreshToken) {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = { register, login, refresh, logout, toPublicUser, signToken, verifyToken };
