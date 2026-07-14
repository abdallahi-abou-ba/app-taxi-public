jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function completeRide(client, driver, paymentMethod = 'CASH') {
  const created = await request(app)
    .post('/api/rides')
    .set(authHeader(client.accessToken))
    .send({ ...RIDE_PAYLOAD, paymentMethod });
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
}

async function settlementOwedByDriver(admin, driver) {
  const generated = await request(app)
    .post('/api/admin/settlements')
    .set(authHeader(admin.accessToken))
    .send({
      driverId: driver.user.id,
      periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  return generated.body.data;
}

describe('driver settlement self-service payment', () => {
  it('lets the driver declare paid via mobile money on a settlement they owe', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    await completeRide(client, driver, 'CASH');

    const settlement = await settlementOwedByDriver(admin, driver);
    expect(settlement.netAmount).toBeLessThan(0);

    const listRes = await request(app).get('/api/users/me/settlements').set(authHeader(driver.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.map((s) => s.id)).toContain(settlement.id);

    const declareRes = await request(app)
      .patch(`/api/users/me/settlements/${settlement.id}/declare-paid`)
      .set(authHeader(driver.accessToken))
      .send({ paymentMethod: 'BANKILY' });
    expect(declareRes.status).toBe(200);
    expect(declareRes.body.data.driverPaymentMethod).toBe('BANKILY');
    expect(declareRes.body.data.driverMarkedPaidAt).not.toBeNull();
    expect(declareRes.body.data.status).toBe('PENDING');

    const confirmRes = await request(app)
      .patch(`/api/admin/settlements/${settlement.id}/pay`)
      .set(authHeader(admin.accessToken));
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('PAID');
  });

  it('rejects declaring paid with CASH (not a mobile-money method)', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    await completeRide(client, driver, 'CASH');
    const settlement = await settlementOwedByDriver(admin, driver);

    const res = await request(app)
      .patch(`/api/users/me/settlements/${settlement.id}/declare-paid`)
      .set(authHeader(driver.accessToken))
      .send({ paymentMethod: 'CASH' });
    expect(res.status).toBe(400);
  });

  it('rejects a different driver declaring someone else\'s settlement', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const otherDriver = await registerUser({ role: 'DRIVER' });
    await completeRide(client, driver, 'CASH');
    const settlement = await settlementOwedByDriver(admin, driver);

    const res = await request(app)
      .patch(`/api/users/me/settlements/${settlement.id}/declare-paid`)
      .set(authHeader(otherDriver.accessToken))
      .send({ paymentMethod: 'BANKILY' });
    expect(res.status).toBe(403);
  });

  it('rejects declaring paid when the company owes the driver instead', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    await completeRide(client, driver, 'CARD');
    const settlement = await settlementOwedByDriver(admin, driver);
    expect(settlement.netAmount).toBeGreaterThan(0);

    const res = await request(app)
      .patch(`/api/users/me/settlements/${settlement.id}/declare-paid`)
      .set(authHeader(driver.accessToken))
      .send({ paymentMethod: 'BANKILY' });
    expect(res.status).toBe(409);
  });

  it('rejects declaring the same settlement paid twice', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    await completeRide(client, driver, 'CASH');
    const settlement = await settlementOwedByDriver(admin, driver);

    await request(app)
      .patch(`/api/users/me/settlements/${settlement.id}/declare-paid`)
      .set(authHeader(driver.accessToken))
      .send({ paymentMethod: 'SEDAD' });
    const res = await request(app)
      .patch(`/api/users/me/settlements/${settlement.id}/declare-paid`)
      .set(authHeader(driver.accessToken))
      .send({ paymentMethod: 'SEDAD' });
    expect(res.status).toBe(409);
  });
});
