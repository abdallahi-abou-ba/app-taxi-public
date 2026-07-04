const prisma = require('../src/lib/prisma');

// Deleted in dependency order: messages reference rides, rides and refresh
// tokens reference users, so they must all go before users.
beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
