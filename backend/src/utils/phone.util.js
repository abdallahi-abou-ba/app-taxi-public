// Mauritanian mobile numbers are 8 digits, dialled internationally as +222.
// Canonicalizes any of the common ways a user might type/paste one (with or
// without a country code prefix, spaces, dashes) to a single stored form -
// necessary now that phone doubles as a login credential (see User.phone's
// @unique constraint) where two differently-formatted strings must never be
// treated as different accounts.
function normalizePhone(raw) {
  if (!raw) return null;

  let digits = String(raw).replace(/[^\d]/g, '');
  if (digits.startsWith('00222')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('222') && digits.length > 8) {
    digits = digits.slice(3);
  }

  if (digits.length !== 8) return null;
  return `+222${digits}`;
}

module.exports = { normalizePhone };
