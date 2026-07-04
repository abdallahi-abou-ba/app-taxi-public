require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { generateUniqueReferralCode } = require('../src/utils/referral.util');

// One-off: referralCode is nullable in the schema (see the add_referral_program
// migration) precisely so this can run after the fact instead of blocking the
// migration on a NOT NULL backfill.
async function main() {
  const users = await prisma.user.findMany({ where: { referralCode: null }, select: { id: true } });
  for (const user of users) {
    const referralCode = await generateUniqueReferralCode();
    await prisma.user.update({ where: { id: user.id }, data: { referralCode } });
  }
  console.log(`Backfilled ${users.length} referral code(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
