const prisma = require('../src/lib/prisma');

// Rides reference users via a required FK, so they must go first.
beforeEach(async () => {
  await prisma.ride.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
