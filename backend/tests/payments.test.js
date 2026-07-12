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

async function completeRide() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
  const rideId = created.body.data.id;
  await advance(rideId, 'accept', driver.accessToken);
  await advance(rideId, 'arrive', driver.accessToken);
  await advance(rideId, 'start', driver.accessToken);
  await advance(rideId, 'complete', driver.accessToken);
  return { client, driver, rideId };
}

describe('payments', () => {
  it('is false by default on a newly requested ride', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    expect(created.body.data.isPaid).toBe(false);
    expect(created.body.data.paidAt).toBeNull();
  });

  it('lets the assigned driver mark a completed ride as paid', async () => {
    const { driver, rideId } = await completeRide();
    const res = await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(driver.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.isPaid).toBe(true);
    expect(res.body.data.paidAt).not.toBeNull();
  });

  it('rejects marking a ride paid before it is completed', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    const rideId = created.body.data.id;
    await advance(rideId, 'accept', driver.accessToken);

    const res = await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(driver.accessToken));
    expect(res.status).toBe(409);
  });

  it('rejects marking the same ride paid twice', async () => {
    const { driver, rideId } = await completeRide();
    await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(driver.accessToken));
    const res = await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(driver.accessToken));
    expect(res.status).toBe(409);
  });

  it('rejects the client marking their own ride as paid', async () => {
    const { client, rideId } = await completeRide();
    const res = await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('rejects a different driver marking a ride they were not assigned to', async () => {
    const { rideId } = await completeRide();
    const otherDriver = await registerUser({ role: 'DRIVER' });
    const res = await request(app).patch(`/api/rides/${rideId}/mark-paid`).set(authHeader(otherDriver.accessToken));
    expect(res.status).toBe(403);
  });

  describe('payment method', () => {
    it('defaults to CASH when not specified', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
      expect(res.body.data.paymentMethod).toBe('CASH');
    });

    it('accepts an explicit CARD selection', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app)
        .post('/api/rides')
        .set(authHeader(client.accessToken))
        .send({ ...RIDE_PAYLOAD, paymentMethod: 'CARD' });
      expect(res.body.data.paymentMethod).toBe('CARD');
    });

    it('rejects an invalid payment method', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app)
        .post('/api/rides')
        .set(authHeader(client.accessToken))
        .send({ ...RIDE_PAYLOAD, paymentMethod: 'BITCOIN' });
      expect(res.status).toBe(400);
    });
  });
});
