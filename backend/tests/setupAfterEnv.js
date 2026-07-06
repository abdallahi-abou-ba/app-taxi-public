const prisma = require('../src/lib/prisma');

// Deleted in dependency order: rides and refresh tokens reference users, so
// they must go before users.
beforeEach(async () => {
  await prisma.ride.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
