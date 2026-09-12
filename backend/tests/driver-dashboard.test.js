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

function getStats(accessToken) {
  return request(app).get('/api/rides/stats').set(authHeader(accessToken));
}

describe('driver dashboard stats', () => {
  it('gives a brand-new driver null rates and no earnings', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await getStats(driver.accessToken);

    expect(res.status).toBe(200);
    expect(res.body.data.acceptanceRate).toBeNull();
    expect(res.body.data.cancellationRate).toBeNull();
    expect(res.body.data.dailyAmount).toBe(0);
    expect(res.body.data.weeklyAmount).toBe(0);
    expect(res.body.data.weeklyRevenueGoal).toBeNull();
  });

  it('reflects a full acceptance rate after accepting and completing a ride', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
    await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
    await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
    await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));

    const res = await getStats(driver.accessToken);
    expect(res.body.data.acceptanceRate).toBe(1);
    expect(res.body.data.cancellationRate).toBe(0);
    expect(res.body.data.dailyAmount).toBeCloseTo(created.body.data.estimatedFare);
    expect(res.body.data.weeklyAmount).toBeCloseTo(created.body.data.estimatedFare);
  });

  it('lowers acceptance rate for a driver who declines', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const decliner = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(decliner.accessToken));

    const res = await getStats(decliner.accessToken);
    expect(res.body.data.acceptanceRate).toBe(0);
  });

  it('raises cancellation rate only for a driver-initiated cancellation', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    await request(app).patch(`/api/rides/${created.body.data.id}/accept`).set(authHeader(driver.accessToken));
    await request(app).patch(`/api/rides/${created.body.data.id}/cancel`).set(authHeader(driver.accessToken));

    const driverStats = await getStats(driver.accessToken);
    expect(driverStats.body.data.cancellationRate).toBe(1);

    const client2 = await registerUser({ role: 'CLIENT' });
    const driver2 = await registerUser({ role: 'DRIVER' });
    const created2 = await requestRide(client2.accessToken);
    await request(app).patch(`/api/rides/${created2.body.data.id}/accept`).set(authHeader(driver2.accessToken));
    await request(app).patch(`/api/rides/${created2.body.data.id}/cancel`).set(authHeader(client2.accessToken));

    const driver2Stats = await getStats(driver2.accessToken);
    expect(driver2Stats.body.data.cancellationRate).toBe(0);
  });

  it('round-trips a weekly revenue goal set via PATCH /api/users/me', async () => {
    const driver = await registerUser({ role: 'DRIVER' });

    const patch = await request(app).patch('/api/users/me').set(authHeader(driver.accessToken)).send({ weeklyRevenueGoal: 5000 });
    expect(patch.status).toBe(200);

    const res = await getStats(driver.accessToken);
    expect(res.body.data.weeklyRevenueGoal).toBe(5000);
  });

  it('does not include driver-only fields for a client', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await getStats(client.accessToken);
    expect(res.body.data.acceptanceRate).toBeUndefined();
    expect(res.body.data.cancellationRate).toBeUndefined();
    expect(res.body.data.ratingAverage).toBeUndefined();
    expect(res.body.data.weeklyRevenueGoal).toBeUndefined();
  });
});
