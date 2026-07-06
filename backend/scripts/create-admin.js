require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

const SALT_ROUNDS = 10;

async function main() {
  const [, , email, password, fullName] = process.argv;
  if (!email || !password || !fullName) {
    console.error('Usage: node scripts/create-admin.js <email> <password> "<full name>"');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.error(`An account with email ${email} already exists (role: ${existing.role}).`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, fullName, role: 'ADMIN' },
  });

  console.log(`Admin account created: ${admin.email} (id: ${admin.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
