jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { WALLET_TOPUP_PRESET_AMOUNTS } = require('../src/utils/walletTopup.util');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

async function createTopUp(driver, amount = WALLET_TOPUP_PRESET_AMOUNTS[0]) {
  const res = await request(app)
    .post('/api/users/me/wallet/topups')
    .set(authHeader(driver.accessToken))
    .send({ amount, confirmationCode: 'BP123456' });
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

  it('lets an admin credit a driver\'s balance directly, confirmed immediately', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });

    const res = await request(app)
      .post('/api/admin/wallet-topups')
      .set(authHeader(admin.accessToken))
      .send({ driverId: driver.user.id, amount: 300 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.method).toBe('COMPANY');
    expect(res.body.data.confirmedByUser.id).toBe(admin.user.id);

    const me = await request(app).get('/api/users/me').set(authHeader(driver.accessToken));
    expect(me.body.data.creditBalance).toBe(300);
  });

  it('rejects a non-FINANCE admin creating a direct top-up', async () => {
    const supportAdmin = await createAdmin({ adminRole: 'SUPPORT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const res = await request(app)
      .post('/api/admin/wallet-topups')
      .set(authHeader(supportAdmin.accessToken))
      .send({ driverId: driver.user.id, amount: 300 });
    expect(res.status).toBe(403);
  });

  it('rejects a direct top-up for a non-driver account', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app)
      .post('/api/admin/wallet-topups')
      .set(authHeader(admin.accessToken))
      .send({ driverId: client.user.id, amount: 300 });
    expect(res.status).toBe(404);
  });

  it('lists the driver\'s own account phone and B-Pay confirmation code for manual reconciliation against the Bankily merchant SMS', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });
    const topUp = await createTopUp(driver);

    const listRes = await request(app)
      .get('/api/admin/wallet-topups?status=PENDING')
      .set(authHeader(admin.accessToken));
    const listed = listRes.body.data.find((t) => t.id === topUp.id);
    expect(listed.driver.phone).toBe(driver.user.phone);
    expect(listed.method).toBe('BANKILY');
    expect(listed.confirmationCode).toBe('BP123456');
  });
});
