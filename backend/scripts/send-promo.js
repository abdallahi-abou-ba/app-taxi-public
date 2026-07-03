require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { sendPushToTokens } = require('../src/utils/push.util');

async function main() {
  const [, , title, body, role] = process.argv;
  if (!title || !body) {
    console.error('Usage: node scripts/send-promo.js "<title>" "<body>" [CLIENT|DRIVER]');
    process.exit(1);
  }
  if (role && role !== 'CLIENT' && role !== 'DRIVER') {
    console.error('The optional 3rd argument must be CLIENT or DRIVER.');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { pushToken: { not: null }, ...(role ? { role } : {}) },
    select: { pushToken: true },
  });
  const tokens = users.map((u) => u.pushToken);

  const { sent, invalid } = await sendPushToTokens(tokens, { title, body, data: { type: 'promo' } });
  console.log(`Sent to ${sent}/${tokens.length} device(s)${invalid ? `, cleared ${invalid} stale token(s)` : ''}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
