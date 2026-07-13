jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function advance(rideId, action, accessToken) {
  return request(app).patch(`/api/rides/${rideId}/${action}`).set(authHeader(accessToken));
}

async function completeRide(paymentMethod) {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await request(app)
    .post('/api/rides')
    .set(authHeader(client.accessToken))
    .send({ ...RIDE_PAYLOAD, paymentMethod });
  const rideId = created.body.data.id;
  await advance(rideId, 'accept', driver.accessToken);
  await advance(rideId, 'arrive', driver.accessToken);
  await advance(rideId, 'start', driver.accessToken);
  await advance(rideId, 'complete', driver.accessToken);
  return { client, driver, rideId };
}

describe('mobile-money declare/confirm payment flow', () => {
  it('rejects marking a mobile-money ride paid via the cash mark-paid endpoint', async () => {
    const { driver, rideId } = await completeRide('BANKILY');
    const res = await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(driver.accessToken));
    expect(res.status).toBe(409);
  });

  it('lets the client declare paid, then the driver confirm receipt', async () => {
    const { client, driver, rideId } = await completeRide('BANKILY');

    const declareRes = await request(app).patch(`/api/rides/${rideId}/declare-paid`).set(authHeader(client.accessToken));
    expect(declareRes.status).toBe(200);
    expect(declareRes.body.data.clientMarkedPaidAt).not.toBeNull();
    expect(declareRes.body.data.isPaid).toBe(false);

    const confirmRes = await request(app).patch(`/api/rides/${rideId}/confirm-payment`).set(authHeader(driver.accessToken));
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.isPaid).toBe(true);
    expect(confirmRes.body.data.paidAt).not.toBeNull();
  });

  it('rejects the driver confirming before the client has declared', async () => {
    const { driver, rideId } = await completeRide('SEDAD');
    const res = await request(app).patch(`/api/rides/${rideId}/confirm-payment`).set(authHeader(driver.accessToken));
    expect(res.status).toBe(409);
  });

  it('rejects declaring paid on a CASH ride', async () => {
    const { client, rideId } = await completeRide('CASH');
    const res = await request(app).patch(`/api/rides/${rideId}/declare-paid`).set(authHeader(client.accessToken));
    expect(res.status).toBe(409);
  });

  it('rejects a different client declaring a ride paid', async () => {
    const { rideId } = await completeRide('MASRIVI');
    const otherClient = await registerUser({ role: 'CLIENT' });
    const res = await request(app).patch(`/api/rides/${rideId}/declare-paid`).set(authHeader(otherClient.accessToken));
    expect(res.status).toBe(403);
  });

  it('rejects declaring the same ride paid twice', async () => {
    const { client, rideId } = await completeRide('CLICK');
    await request(app).patch(`/api/rides/${rideId}/declare-paid`).set(authHeader(client.accessToken));
    const res = await request(app).patch(`/api/rides/${rideId}/declare-paid`).set(authHeader(client.accessToken));
    expect(res.status).toBe(409);
  });
});
