require('dotenv').config();
const prisma = require('../src/lib/prisma');

// Drivers created before the approval feature existed have approvalStatus =
// null (the migration only sets PENDING for new registrations going
// forward). Treat them as already trusted/approved rather than retroactively
// locking out accounts that were already operating - same reasoning as
// backfill-referral-codes.js for referralCode.
async function main() {
  const { count } = await prisma.user.updateMany({
    where: { role: 'DRIVER', approvalStatus: null },
    data: { approvalStatus: 'APPROVED', approvedAt: new Date() },
  });
  console.log(`Approved ${count} pre-existing driver account(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
