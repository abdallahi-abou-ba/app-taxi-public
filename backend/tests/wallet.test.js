jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const env = require('../src/config/env');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

describe('driver wallet top-up', () => {
  it('exposes the minimum amount and the single company Bankily merchant code, same for every driver', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app).get('/api/users/me/wallet/topup-info').set(authHeader(driver.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.minAmount).toBe(env.WALLET_TOPUP_MIN_AMOUNT);
    expect(res.body.data.merchantCode).toBe(env.WALLET_TOPUP_MERCHANT_CODE);

    const otherDriver = await registerUser({ role: 'DRIVER' });
    const otherRes = await request(app).get('/api/users/me/wallet/topup-info').set(authHeader(otherDriver.accessToken));
    expect(otherRes.body.data.merchantCode).toBe(res.body.data.merchantCode);
  });

  it('rejects an amount below the minimum', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: env.WALLET_TOPUP_MIN_AMOUNT - 1 });
    expect(res.status).toBe(422);
  });

  it('rejects a client trying to top up (driver-only feature)', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(client.accessToken))
      .send({ amount: 500 });
    expect(res.status).toBe(403);
  });

  it('creates a top-up already declared as BANKILY, pending admin confirmation', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: 500 });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.method).toBe('BANKILY');
    expect(res.body.data.driverDeclaredAt).not.toBeNull();

    const listRes = await request(app).get('/api/users/me/wallet/topups').set(authHeader(driver.accessToken));
    expect(listRes.body.data.map((t) => t.id)).toContain(res.body.data.id);
  });
});

describe('wallet top-up merchant code setting', () => {
  it('lets an admin override the merchant code, reflected immediately in topup-info', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });

    const settings = await request(app)
      .patch('/api/admin/settings')
      .set(authHeader(admin.accessToken))
      .send({ walletTopupMerchantCode: '654321' });
    expect(settings.status).toBe(200);
    expect(settings.body.data.walletTopupMerchantCode).toBe('654321');

    const info = await request(app).get('/api/users/me/wallet/topup-info').set(authHeader(driver.accessToken));
    expect(info.body.data.merchantCode).toBe('654321');
  });

  it('rejects a merchant code that is not exactly 6 digits', async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .patch('/api/admin/settings')
      .set(authHeader(admin.accessToken))
      .send({ walletTopupMerchantCode: '12345' });
    expect(res.status).toBe(400);
  });
});
