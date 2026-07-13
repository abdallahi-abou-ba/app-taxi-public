const crypto = require('crypto');
const prisma = require('../lib/prisma');
const env = require('../config/env');
const AppError = require('../utils/appError');
const { normalizePhone } = require('../utils/phone.util');
const { sendOtpSms } = require('../utils/sms.util');

const CODE_LENGTH = 6;

// Same rationale as auth.service.js's refresh-token hashing: never store the
// actual code, so a leaked DB doesn't hand out usable codes.
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateCode() {
  return String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

async function requestOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw new AppError('Invalid phone number', 422, 'VALIDATION_ERROR');
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.phoneOtp.count({ where: { phone, createdAt: { gte: oneHourAgo } } });
  if (recentCount >= env.OTP_MAX_REQUESTS_PER_HOUR) {
    throw new AppError('Too many code requests, please try again later', 429, 'RATE_LIMITED');
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MIN * 60 * 1000);
  await prisma.phoneOtp.create({ data: { phone, codeHash: hashCode(code), expiresAt } });

  const { stub } = await sendOtpSms(phone, code);

  return {
    phone,
    expiresInSec: env.OTP_TTL_MIN * 60,
    // Only surfaced when there's no real delivery channel - see sms.util.js.
    ...(stub && { devCode: code }),
  };
}

// Returns the normalized phone on success. Throws (never returns falsy) on
// any failure, so callers don't need their own truthiness check.
async function verifyAndConsumeOtp(rawPhone, code) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw new AppError('Invalid phone number', 422, 'VALIDATION_ERROR');
  }

  const otp = await prisma.phoneOtp.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) {
    throw new AppError('No active code for this phone number - request a new one', 401, 'UNAUTHORIZED');
  }
  if (otp.attempts >= env.OTP_MAX_VERIFY_ATTEMPTS) {
    throw new AppError('Too many incorrect attempts - request a new code', 401, 'UNAUTHORIZED');
  }

  if (hashCode(code) !== otp.codeHash) {
    await prisma.phoneOtp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new AppError('Incorrect code', 401, 'UNAUTHORIZED');
  }

  await prisma.phoneOtp.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return phone;
}

module.exports = { requestOtp, verifyAndConsumeOtp };
