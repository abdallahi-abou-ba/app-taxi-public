const crypto = require('crypto');
const prisma = require('../lib/prisma');

// Excludes visually ambiguous characters (0/O, 1/I/L) so a code is easy to
// read aloud or retype from a friend's screen.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 7;

function generateReferralCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

async function generateUniqueReferralCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code after 5 attempts');
}

module.exports = { generateReferralCode, generateUniqueReferralCode };
