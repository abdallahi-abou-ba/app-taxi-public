const prisma = require('../src/lib/prisma');

// Deleted in dependency order (children before parents): commissionChange
// and vehicleAssignment reference users (and vehicleAssignment references
// vehicle too), rides/refreshTokens reference users, vehicle holds a
// nullable FK to users - all must go before users. complaint references
// both ride and user, so it goes before ride; expense references vehicle
// and user, so it goes before vehicle.
beforeEach(async () => {
  await prisma.complaint.deleteMany();
  await prisma.commissionChange.deleteMany();
  await prisma.vehicleAssignment.deleteMany();
  await prisma.adminActivityLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.walletTopUp.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  // No FK to User (a code can be requested before an account exists) - see
  // PhoneOtp's own doc comment - so no ordering constraint vs. the above.
  await prisma.phoneOtp.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
