const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { generateUniqueReferralCode } = require('../utils/referral.util');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { getDefaultCommissionRate } = require('./appSetting.service');
const phoneOtpService = require('./phoneOtp.service');

const REGISTRATION_TOKEN_PURPOSE = 'PHONE_VERIFIED';

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

  const passwordHash = await hashPassword(password);
  const myReferralCode = await generateUniqueReferralCode();
  const commissionRate = role === 'DRIVER' ? await getDefaultCommissionRate() : undefined;

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
      commissionRate,
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

  // Defensive: every row reachable via a unique `email` lookup is expected to
  // have a passwordHash too (see User.email's doc comment on that invariant),
  // but this keeps a phone-only account from ever reaching comparePassword
  // with a null hash if that invariant is ever violated.
  if (!user.passwordHash) {
    throw new AppError('This account does not use a password. Use phone login instead.', 401, 'UNAUTHORIZED');
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  // Checked after the password match (not before) so a wrong-password
  // attempt against a blocked account still gets the generic invalid-
  // credentials message, never leaking the account's status.
  if (user.approvalStatus === 'BLOCKED') {
    throw new AppError('Your account has been blocked. Contact support.', 403, 'FORBIDDEN');
  }

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

// Primary mobile auth as of the phone+password rollout - mirrors
// register()/login() above exactly, just keyed on phone instead of email (no
// email collected at all). nom/prenom are combined into the single fullName
// column used everywhere else in the app rather than adding new columns.
async function registerByPhone({ phone, password, nom, prenom, role, vehiclePlate, vehicleModel }) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new AppError('An account with this phone number already exists', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(password);
  const myReferralCode = await generateUniqueReferralCode();
  const commissionRate = role === 'DRIVER' ? await getDefaultCommissionRate() : undefined;

  const user = await prisma.user.create({
    data: {
      phone,
      passwordHash,
      fullName: `${prenom} ${nom}`.trim(),
      role,
      isAvailable: role === 'DRIVER' ? false : null,
      vehiclePlate: role === 'DRIVER' ? vehiclePlate : undefined,
      vehicleModel: role === 'DRIVER' ? vehicleModel : undefined,
      approvalStatus: role === 'DRIVER' ? 'PENDING' : null,
      commissionRate,
      referralCode: myReferralCode,
    },
  });

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

async function loginByPhone({ phone, password }) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new AppError('Invalid phone number or password', 401, 'UNAUTHORIZED');
  }

  // Defensive: a legacy phone+OTP account (from before this rollout) has no
  // passwordHash - fail closed with a clear message instead of crashing on
  // comparePassword.
  if (!user.passwordHash) {
    throw new AppError('This account has no password set. Contact support.', 401, 'UNAUTHORIZED');
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('Invalid phone number or password', 401, 'UNAUTHORIZED');
  }

  if (user.approvalStatus === 'BLOCKED') {
    throw new AppError('Your account has been blocked. Contact support.', 403, 'FORBIDDEN');
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
  if (stored.user.approvalStatus === 'BLOCKED') {
    throw new AppError('Your account has been blocked. Contact support.', 403, 'FORBIDDEN');
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

// Bridges phone verification (requestOtp/verifyOtp below) to profile
// completion, so a new user isn't asked to re-enter their OTP code a second
// time. Reuses JWT_SECRET (safe even if replayed against requireAuth - that
// middleware looks up payload.sub, which this token never sets, so it fails
// closed with 401 rather than granting any access).
function signRegistrationToken(phone) {
  return jwt.sign({ phone, purpose: REGISTRATION_TOKEN_PURPOSE }, env.JWT_SECRET, {
    expiresIn: `${env.REGISTRATION_TOKEN_TTL_MIN}m`,
  });
}

function verifyRegistrationToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired registration token', 401, 'UNAUTHORIZED');
  }
  if (payload.purpose !== REGISTRATION_TOKEN_PURPOSE) {
    throw new AppError('Invalid or expired registration token', 401, 'UNAUTHORIZED');
  }
  return payload;
}

async function requestOtp(phone) {
  return phoneOtpService.requestOtp(phone);
}

// Phone+OTP is passwordless: an existing account logs straight in once the
// code checks out; a phone with no matching account instead gets a
// short-lived registrationToken so the client can collect the rest of the
// profile (see completeRegistration) without re-verifying the code.
async function verifyOtp(phone, code) {
  const normalizedPhone = await phoneOtpService.verifyAndConsumeOtp(phone, code);
  const user = await prisma.user.findFirst({ where: { phone: normalizedPhone } });

  if (!user) {
    return { isNewUser: true, registrationToken: signRegistrationToken(normalizedPhone) };
  }

  if (user.approvalStatus === 'BLOCKED') {
    throw new AppError('Your account has been blocked. Contact support.', 403, 'FORBIDDEN');
  }

  return { isNewUser: false, user: toPublicUser(user), ...(await issueTokens(user)) };
}

// Phone+OTP signup collects nothing beyond phone/code (+ vehicle info for a
// driver) - the mobile UI doesn't ask for a name at all, so this always
// stands in for one. Editable later via PATCH /api/users/me.
function defaultFullName(role, phone) {
  const last4 = phone.slice(-4);
  return `${role === 'DRIVER' ? 'Chauffeur' : 'Client'} ${last4}`;
}

async function completeRegistration({ registrationToken, fullName, role, vehiclePlate, vehicleModel }) {
  const { phone } = verifyRegistrationToken(registrationToken);

  const myReferralCode = await generateUniqueReferralCode();
  const commissionRate = role === 'DRIVER' ? await getDefaultCommissionRate() : undefined;

  let user;
  try {
    user = await prisma.user.create({
      data: {
        phone,
        fullName: fullName || defaultFullName(role, phone),
        role,
        isAvailable: role === 'DRIVER' ? false : null,
        vehiclePlate: role === 'DRIVER' ? vehiclePlate : undefined,
        vehicleModel: role === 'DRIVER' ? vehicleModel : undefined,
        approvalStatus: role === 'DRIVER' ? 'PENDING' : null,
        commissionRate,
        referralCode: myReferralCode,
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError('This phone number was just registered', 409, 'CONFLICT');
    }
    throw err;
  }

  return { user: toPublicUser(user), ...(await issueTokens(user)) };
}

module.exports = {
  register,
  login,
  registerByPhone,
  loginByPhone,
  refresh,
  logout,
  toPublicUser,
  signToken,
  verifyToken,
  requestOtp,
  verifyOtp,
  completeRegistration,
};
