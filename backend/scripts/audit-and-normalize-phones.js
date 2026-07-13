require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { normalizePhone } = require('../src/utils/phone.util');

// Run this BEFORE deploying the migration that adds @unique to User.phone
// (see the phone+OTP auth rollout) - phone has never been validated or
// deduplicated before now, so two accounts could already share a
// differently-formatted version of the same number. Safe to re-run.
async function main() {
  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, phone: true, email: true },
  });

  const normalizedByPhone = new Map();
  const conflicts = [];
  const unnormalizable = [];

  for (const user of users) {
    const normalized = normalizePhone(user.phone);
    if (!normalized) {
      unnormalizable.push(user);
      continue;
    }
    if (!normalizedByPhone.has(normalized)) {
      normalizedByPhone.set(normalized, []);
    }
    normalizedByPhone.get(normalized).push(user);
  }

  for (const [normalized, group] of normalizedByPhone) {
    if (group.length > 1) {
      conflicts.push({ normalized, users: group });
    }
  }

  if (unnormalizable.length > 0) {
    console.log(`\n${unnormalizable.length} account(s) with a phone that doesn't normalize to a valid 8-digit Mauritanian number:`);
    for (const u of unnormalizable) {
      console.log(`  - ${u.id} (${u.email || 'no email'}): "${u.phone}"`);
    }
    console.log('These will be left untouched here - null them out or fix manually before the @unique migration.');
  }

  if (conflicts.length > 0) {
    console.log(`\n${conflicts.length} phone number(s) shared by more than one account after normalization:`);
    for (const { normalized, users: group } of conflicts) {
      console.log(`  - ${normalized}:`);
      for (const u of group) console.log(`      ${u.id} (${u.email || 'no email'}): "${u.phone}"`);
    }
    console.log('These need manual resolution (support decides which account keeps the number) before the @unique migration - not auto-resolved by this script.');
  }

  // Only safe, unambiguous normalizations get written: a phone that normalizes
  // cleanly and isn't shared with another account.
  const toUpdate = users.filter((u) => {
    const normalized = normalizePhone(u.phone);
    return normalized && normalized !== u.phone && (normalizedByPhone.get(normalized) || []).length === 1;
  });

  for (const u of toUpdate) {
    await prisma.user.update({ where: { id: u.id }, data: { phone: normalizePhone(u.phone) } });
  }

  console.log(`\nNormalized ${toUpdate.length} phone number(s) in place.`);
  console.log(`${conflicts.length} conflict(s) and ${unnormalizable.length} unnormalizable value(s) still need manual attention before applying the @unique migration.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
