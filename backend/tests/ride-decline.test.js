// See rides.test.js for the same OSRM mock rationale.
jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

function requestRide(accessToken) {
  return request(app).post('/api/rides').set(authHeader(accessToken)).send(RIDE_PAYLOAD);
}

describe('PATCH /api/rides/:id/decline', () => {
  it('lets a driver decline a requested ride without changing its status', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    const res = await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(driver.accessToken));
    expect(res.status).toBe(200);

    const stillRequested = await request(app).get(`/api/rides/${rideId}`).set(authHeader(client.accessToken));
    expect(stillRequested.body.data.status).toBe('REQUESTED');
  });

  it('lets a different driver still accept a ride another driver declined', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const decliningDriver = await registerUser({ role: 'DRIVER' });
    const acceptingDriver = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(decliningDriver.accessToken));
    const accepted = await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(acceptingDriver.accessToken));
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.driver.id).toBe(acceptingDriver.user.id);
  });

  it('is idempotent when the same driver declines twice', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    const first = await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(driver.accessToken));
    const second = await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(driver.accessToken));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it('rejects declining a ride that already has a driver', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const lateDriver = await registerUser({ role: 'DRIVER' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));

    const res = await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(lateDriver.accessToken));
    expect(res.status).toBe(409);
  });

  it('is restricted to the DRIVER role', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    const res = await request(app).patch(`/api/rides/${rideId}/decline`).set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });
});
