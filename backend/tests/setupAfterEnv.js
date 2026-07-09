const prisma = require('../src/lib/prisma');

// Deleted in dependency order (children before parents): commissionChange
// and vehicleAssignment reference users (and vehicleAssignment references
// vehicle too), rides/refreshTokens reference users, vehicle holds a
// nullable FK to users - all must go before users.
beforeEach(async () => {
  await prisma.commissionChange.deleteMany();
  await prisma.vehicleAssignment.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
