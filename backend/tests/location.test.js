jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');
const { publishToUser } = require('../src/lib/realtime');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

function postLocation(accessToken, lat = 33.58, lng = -7.59) {
  return request(app).post('/api/location').set(authHeader(accessToken)).send({ lat, lng });
}

describe('POST /api/location', () => {
  beforeEach(() => {
    publishToUser.mockClear();
  });

  it('lets a client post their own location (no longer driver-only)', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await postLocation(client.accessToken);
    expect(res.status).toBe(200);
  });

  it('does not notify anyone when the client has no accepted ride yet', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);

    await postLocation(client.accessToken);
    expect(publishToUser).not.toHaveBeenCalled();
  });

  it('relays the client location to the assigned driver once accepted', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    const rideId = created.body.data.id;
    await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));

    await postLocation(client.accessToken, 33.6, -7.6);

    expect(publishToUser).toHaveBeenCalledWith(driver.user.id, 'client:location', { rideId, lat: 33.6, lng: -7.6 });
  });

  it('still relays the driver location to the client (existing behavior, now covered)', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    const rideId = created.body.data.id;
    await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));

    await postLocation(driver.accessToken, 33.57, -7.58);

    expect(publishToUser).toHaveBeenCalledWith(client.user.id, 'driver:location', { rideId, lat: 33.57, lng: -7.58 });
  });
});
