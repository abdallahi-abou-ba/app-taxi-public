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
async function registerUser(overrides = {}) {
  const payload = {
    email: uniqueEmail((overrides.role || 'user').toLowerCase()),
    password: 'password123',
    fullName: 'Test User',
    role: 'CLIENT',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

module.exports = { app, prisma, uniqueEmail, registerUser, authHeader };
