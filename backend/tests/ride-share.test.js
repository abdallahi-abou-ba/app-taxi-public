jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };
const UNKNOWN_TOKEN = 'a'.repeat(32);

async function makeClientAndDriver() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  return { client, driver };
}

function requestRide(accessToken) {
  return request(app).post('/api/rides').set(authHeader(accessToken)).send(RIDE_PAYLOAD);
}

describe('ride trip-sharing', () => {
  it('lets a participant create a share link, and reuses the same token on a second call', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    const first = await request(app).post(`/api/rides/${rideId}/share-link`).set(authHeader(client.accessToken));
    expect(first.status).toBe(200);
    expect(first.body.data.url).toMatch(/\/track\/[a-f0-9]{32}$/);

    const second = await request(app).post(`/api/rides/${rideId}/share-link`).set(authHeader(client.accessToken));
    expect(second.status).toBe(200);
    // Compare tokens, not full URLs - supertest binds a fresh ephemeral port
    // per request(app) call, so the host:port legitimately differs even
    // though the underlying share token must stay the same.
    expect(second.body.data.url.split('/track/')[1]).toBe(first.body.data.url.split('/track/')[1]);
  });

  it('rejects a non-participant', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const outsider = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    const res = await request(app).post(`/api/rides/${rideId}/share-link`).set(authHeader(outsider.accessToken));
    expect(res.status).toBe(403);
  });

  it('serves the public tracking view without auth, hiding phone numbers', async () => {
    const { client, driver } = await makeClientAndDriver();
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));

    const link = await request(app).post(`/api/rides/${rideId}/share-link`).set(authHeader(client.accessToken));
    const token = link.body.data.url.split('/track/')[1];

    const view = await request(app).get(`/api/track/${token}`);
    expect(view.status).toBe(200);
    expect(view.body.data.status).toBe('ACCEPTED');
    expect(view.body.data.pickupLat).toBe(RIDE_PAYLOAD.pickupLat);
    expect(view.body.data.driverName).toBe(driver.user.fullName);
    expect(JSON.stringify(view.body.data)).not.toContain(driver.user.phone || '__none__');
  });

  it('returns 410 once the ride has ended', async () => {
    const { client, driver } = await makeClientAndDriver();
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    const link = await request(app).post(`/api/rides/${rideId}/share-link`).set(authHeader(client.accessToken));
    const token = link.body.data.url.split('/track/')[1];

    await request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(client.accessToken));

    const view = await request(app).get(`/api/track/${token}`);
    expect(view.status).toBe(410);
  });

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).get(`/api/track/${UNKNOWN_TOKEN}`);
    expect(res.status).toBe(404);
  });

  it('rejects a malformed token before it reaches the database lookup', async () => {
    const res = await request(app).get('/api/track/not-a-valid-token');
    expect(res.status).toBe(400);
  });
});
