jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

async function createTopUp(driver, amount = 500) {
  const res = await request(app)
    .post('/api/users/me/wallet/topups')
    .set(authHeader(driver.accessToken))
    .send({ amount, method: 'BANKILY', payerPhone: '22233445566' });
  return res.body.data;
}

describe('admin wallet top-up review', () => {
  it('lists pending top-ups and confirms one, crediting the balance', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });
    const topUp = await createTopUp(driver, 500);

    const listRes = await request(app)
      .get('/api/admin/wallet-topups?status=PENDING')
      .set(authHeader(admin.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.map((t) => t.id)).toContain(topUp.id);

    const confirmRes = await request(app)
      .patch(`/api/admin/wallet-topups/${topUp.id}/confirm`)
      .set(authHeader(admin.accessToken));
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');
    expect(confirmRes.body.data.confirmedByUser.id).toBe(admin.user.id);

    const me = await request(app).get('/api/users/me').set(authHeader(driver.accessToken));
    expect(me.body.data.creditBalance).toBe(500);
  });

  it('rejects confirming the same top-up twice', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });
    const topUp = await createTopUp(driver);

    await request(app).patch(`/api/admin/wallet-topups/${topUp.id}/confirm`).set(authHeader(admin.accessToken));
    const res = await request(app).patch(`/api/admin/wallet-topups/${topUp.id}/confirm`).set(authHeader(admin.accessToken));
    expect(res.status).toBe(409);
  });

  it('cancels a pending top-up without touching the balance', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });
    const topUp = await createTopUp(driver);

    const cancelRes = await request(app)
      .patch(`/api/admin/wallet-topups/${topUp.id}/cancel`)
      .set(authHeader(admin.accessToken));
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const me = await request(app).get('/api/users/me').set(authHeader(driver.accessToken));
    expect(me.body.data.creditBalance).toBe(0);
  });

  it('rejects a non-FINANCE admin confirming a top-up', async () => {
    const supportAdmin = await createAdmin({ adminRole: 'SUPPORT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const topUp = await createTopUp(driver);

    const res = await request(app)
      .patch(`/api/admin/wallet-topups/${topUp.id}/confirm`)
      .set(authHeader(supportAdmin.accessToken));
    expect(res.status).toBe(403);
  });

  it('lets an admin set and read back the merchant code setting', async () => {
    const admin = await createAdmin();
    const patchRes = await request(app)
      .patch('/api/admin/settings')
      .set(authHeader(admin.accessToken))
      .send({ walletTopupMerchantCode: 'TAXI-12345' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.walletTopupMerchantCode).toBe('TAXI-12345');

    const driver = await registerUser({ role: 'DRIVER' });
    const infoRes = await request(app).get('/api/users/me/wallet/topup-info').set(authHeader(driver.accessToken));
    expect(infoRes.body.data.merchantCode).toBe('TAXI-12345');
  });
});
