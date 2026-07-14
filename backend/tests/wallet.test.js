jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const env = require('../src/config/env');
const { app, registerUser, authHeader } = require('./helpers');

describe('driver wallet top-up', () => {
  it('exposes the minimum amount and (unset) merchant code', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app).get('/api/users/me/wallet/topup-info').set(authHeader(driver.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.minAmount).toBe(env.WALLET_TOPUP_MIN_AMOUNT);
    expect(res.body.data.merchantCode).toBeNull();
  });

  it('rejects an amount below the minimum', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: env.WALLET_TOPUP_MIN_AMOUNT - 1, method: 'BANKILY', payerPhone: '22233445566' });
    expect(res.status).toBe(422);
  });

  it('rejects a client trying to top up (driver-only feature)', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(client.accessToken))
      .send({ amount: 500, method: 'BANKILY', payerPhone: '22233445566' });
    expect(res.status).toBe(403);
  });

  it('rejects CARD as a method (mobile-money only)', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: 500, method: 'CARD', payerPhone: '22233445566' });
    expect(res.status).toBe(400);
  });

  it('requires a payer phone', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: 500, method: 'BANKILY' });
    expect(res.status).toBe(400);
  });

  it('creates a top-up already declared, pending admin confirmation', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: 500, method: 'SEDAD', payerPhone: '22233445566' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.method).toBe('SEDAD');
    expect(res.body.data.payerPhone).toBe('22233445566');
    expect(res.body.data.driverDeclaredAt).not.toBeNull();

    const listRes = await request(app).get('/api/users/me/wallet/topups').set(authHeader(driver.accessToken));
    expect(listRes.body.data.map((t) => t.id)).toContain(res.body.data.id);
  });
});
