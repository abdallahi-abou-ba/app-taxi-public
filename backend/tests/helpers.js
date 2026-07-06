// expo-server-sdk ships a build that uses ESM `import` syntax, which Jest's
// default CJS transform can't parse. app.js wires up every route
// unconditionally, so even tests that never touch rides would otherwise
// pull it in transitively through ride.service.js. Mocked here, once, since
// sendPushToUser already no-ops for test users (none have a real Expo push
// token) - this just avoids loading the real dependency at all.
jest.mock('../src/utils/push.util', () => ({ sendPushToUser: jest.fn() }));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

let counter = 0;
function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@test.local`;
}

// Registers a user through the real HTTP endpoint (not a direct DB insert),
// so tests exercise the same code path a real signup would.
//
// A DRIVER registration now requires vehiclePlate and starts PENDING (see
// admin.test.js) - most existing tests just want a working driver without
// exercising the approval flow themselves, so this auto-fills a plate and
// auto-approves unless the caller passes `skipApproval: true`.
async function registerUser(overrides = {}) {
  const { skipApproval, ...rest } = overrides;
  const payload = {
    email: uniqueEmail((rest.role || 'user').toLowerCase()),
    password: 'password123',
    fullName: 'Test User',
    role: 'CLIENT',
    ...(rest.role === 'DRIVER' ? { vehiclePlate: '1234-AB-01' } : {}),
    ...rest,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const data = res.body.data;
  if (payload.role === 'DRIVER' && !skipApproval) {
    await prisma.user.update({ where: { id: data.user.id }, data: { approvalStatus: 'APPROVED', approvedAt: new Date() } });
    data.user.approvalStatus = 'APPROVED';
  }
  return data;
}

async function createAdmin(overrides = {}) {
  const bcrypt = require('bcryptjs');
  const email = uniqueEmail('admin');
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName: 'Test Admin', role: 'ADMIN', ...overrides },
  });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
  if (res.status !== 200) {
    throw new Error(`createAdmin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { ...res.body.data, user };
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

module.exports = { app, prisma, uniqueEmail, registerUser, createAdmin, authHeader };
