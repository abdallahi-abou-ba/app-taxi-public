jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

function requestRide(accessToken) {
  return request(app).post('/api/rides').set(authHeader(accessToken)).send(RIDE_PAYLOAD);
}

async function completeARide() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await requestRide(client.accessToken);
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
  return { client, driver, rideId, fare: created.body.data.estimatedFare };
}

describe('DELETE /api/rides/:id/history', () => {
  it('hides a completed ride from the caller only, not the counterpart', async () => {
    const { client, driver, rideId } = await completeARide();

    const hide = await request(app).delete(`/api/rides/${rideId}/history`).set(authHeader(client.accessToken));
    expect(hide.status).toBe(200);

    const clientList = await request(app).get('/api/rides').set(authHeader(client.accessToken));
    expect(clientList.body.data.find((r) => r.id === rideId)).toBeUndefined();

    const driverList = await request(app).get('/api/rides').set(authHeader(driver.accessToken));
    expect(driverList.body.data.find((r) => r.id === rideId)).toBeDefined();
  });

  it('rejects hiding a ride that is still active', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    const res = await request(app).delete(`/api/rides/${rideId}/history`).set(authHeader(client.accessToken));
    expect(res.status).toBe(409);
  });

  it('rejects a non-participant', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const outsider = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    await request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(client.accessToken));

    const res = await request(app).delete(`/api/rides/${rideId}/history`).set(authHeader(outsider.accessToken));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/rides/stats', () => {
  it('starts at zero for a fresh user', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/rides/stats').set(authHeader(client.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ completedRides: 0, totalAmount: 0, ridesThisMonth: 0 });
  });

  it('counts a completed ride toward both participants stats', async () => {
    const { client, driver, fare } = await completeARide();

    const clientStats = await request(app).get('/api/rides/stats').set(authHeader(client.accessToken));
    expect(clientStats.body.data.completedRides).toBe(1);
    expect(clientStats.body.data.totalAmount).toBeCloseTo(fare);
    expect(clientStats.body.data.ridesThisMonth).toBe(1);

    const driverStats = await request(app).get('/api/rides/stats').set(authHeader(driver.accessToken));
    expect(driverStats.body.data.completedRides).toBe(1);
    expect(driverStats.body.data.totalAmount).toBeCloseTo(fare);
  });
});
