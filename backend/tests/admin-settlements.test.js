jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
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
  const completed = await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
  return completed.body.data;
}

describe('admin driver settlements', () => {
  it('rejects a non-admin caller', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/settlements').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('generates a settlement netting cash commission owed against card net owed, then pays it', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const cashRide = await completeRide(client, driver, 'CASH');
    const cardRide = await completeRide(client, driver, 'CARD');

    const generated = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({
        driverId: driver.user.id,
        periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        periodEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    expect(generated.status).toBe(201);
    expect(generated.body.data.status).toBe('PENDING');
    expect(generated.body.data.cashCommissionOwed).toBeCloseTo(cashRide.commissionAmount, 2);
    expect(generated.body.data.cardNetOwed).toBeCloseTo(cardRide.driverNetAmount, 2);
    expect(generated.body.data.netAmount).toBeCloseTo(cardRide.driverNetAmount - cashRide.commissionAmount, 2);

    const settlementId = generated.body.data.id;

    const list = await request(app).get('/api/admin/settlements').set(authHeader(admin.accessToken));
    expect(list.body.data.map((s) => s.id)).toContain(settlementId);

    const paid = await request(app).patch(`/api/admin/settlements/${settlementId}/pay`).set(authHeader(admin.accessToken));
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');
    expect(paid.body.data.paidByUser.id).toBe(admin.user.id);

    const rePay = await request(app).patch(`/api/admin/settlements/${settlementId}/pay`).set(authHeader(admin.accessToken));
    expect(rePay.status).toBe(409);
  });

  it('rejects a period where periodEnd is not after periodStart', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });

    const res = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({ driverId: driver.user.id, periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() - 1000).toISOString() });
    expect(res.status).toBe(422);
  });
});
