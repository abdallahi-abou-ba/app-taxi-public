const { z } = require('zod');
const { normalizePhone } = require('../utils/phone.util');

const phoneField = z
  .string()
  .trim()
  .refine((v) => normalizePhone(v) !== null, 'Invalid phone number')
  .transform(normalizePhone);

// phone is deliberately absent here - now that it doubles as a login
// credential, changing it must go through the OTP-verified flow below
// (requestPhoneOtpSchema/verifyPhoneOtpSchema), not a raw unverified PATCH.
const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
});

const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  currentLat: z.number().min(-90).max(90).optional(),
  currentLng: z.number().min(-180).max(180).optional(),
});

// Nullable so the app can explicitly unregister on logout.
const updatePushTokenSchema = z.object({
  pushToken: z.string().min(1).nullable(),
});

// Exactly one of the two is required, enforced in user.service.js#deleteAccount
// depending on whether the account has a password (legacy/email) or not
// (phone+OTP) - not encoded here since that depends on DB state the
// validator layer doesn't have.
const deleteAccountSchema = z.object({
  password: z.string().min(1).optional(),
  otpCode: z.string().trim().length(6).optional(),
});

const requestPhoneOtpSchema = z.object({
  phone: phoneField,
});

const verifyPhoneOtpSchema = z.object({
  phone: phoneField,
  code: z.string().trim().length(6, 'Code must be 6 digits'),
});

module.exports = {
  updateProfileSchema,
  updateAvailabilitySchema,
  updatePushTokenSchema,
  deleteAccountSchema,
  requestPhoneOtpSchema,
  verifyPhoneOtpSchema,
};
