// OSRM hits a public demo server (see osrm.util.js) - mocked here so ride
// tests are fast, deterministic, and don't depend on that server's uptime.
// Resolving to null forces the haversine + flat-speed fallback path.
jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function makeClientAndDriver() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  return { client, driver };
}

function requestRide(accessToken, payload = RIDE_PAYLOAD) {
  return request(app).post('/api/rides').set(authHeader(accessToken)).send(payload);
}

describe('rides', () => {
  describe('POST /api/rides', () => {
    it('creates a ride with a computed fare, falling back to the haversine estimate when OSRM is unavailable', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await requestRide(client.accessToken);

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('REQUESTED');
      expect(res.body.data.distanceKm).toBeGreaterThan(0);
      expect(res.body.data.estimatedFare).toBeGreaterThan(0);
      expect(res.body.data.routeGeometry).toBeNull();
    });

    it('rejects a second ride while one is already active', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      await requestRide(client.accessToken);
      const second = await requestRide(client.accessToken);
      expect(second.status).toBe(409);
    });

    it('is restricted to the CLIENT role', async () => {
      const driver = await registerUser({ role: 'DRIVER' });
      const res = await requestRide(driver.accessToken);
      expect(res.status).toBe(403);
    });

    it('rejects an invalid payload', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send({ pickupLat: 999 });
      expect(res.status).toBe(400);
    });
  });

  describe('ride lifecycle', () => {
    it('walks a ride through accept -> arrive -> start -> complete', async () => {
      const { client, driver } = await makeClientAndDriver();
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;

      const accepted = await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
      expect(accepted.status).toBe(200);
      expect(accepted.body.data.status).toBe('ACCEPTED');
      expect(accepted.body.data.driver.id).toBe(driver.user.id);
      expect(accepted.body.data.acceptedAt).not.toBeNull();

      const arrived = await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
      expect(arrived.status).toBe(200);
      expect(arrived.body.data.status).toBe('ARRIVED');

      const started = await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
      expect(started.status).toBe(200);
      expect(started.body.data.status).toBe('IN_PROGRESS');

      const completed = await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
      expect(completed.status).toBe(200);
      expect(completed.body.data.status).toBe('COMPLETED');
      expect(completed.body.data.completedAt).not.toBeNull();
    });

    it('rejects a second driver accepting an already-accepted ride', async () => {
      const { client, driver } = await makeClientAndDriver();
      const otherDriver = await registerUser({ role: 'DRIVER' });
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;

      const first = await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
      expect(first.status).toBe(200);

      const second = await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(otherDriver.accessToken));
      expect(second.status).toBe(409);
    });

    it('rejects skipping a transition (e.g. completing a ride that has not started)', async () => {
      const { client, driver } = await makeClientAndDriver();
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;
      await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));

      const res = await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
      expect(res.status).toBe(409);
    });

    it('lets the client cancel a requested ride', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;

      const res = await request(app)
        .patch(`/api/rides/${rideId}/cancel`)
        .set(authHeader(client.accessToken))
        .send({ reason: 'changed my mind' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');
      expect(res.body.data.cancelledBy).toBe('CLIENT');
    });

    it('rejects cancelling a ride that already ended', async () => {
      const { client, driver } = await makeClientAndDriver();
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;
      await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
      await request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(driver.accessToken));

      const res = await request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(client.accessToken));
      expect(res.status).toBe(409);
    });
  });

  describe('read access', () => {
    it('lets a participant read a ride but rejects an outsider', async () => {
      const { client, driver } = await makeClientAndDriver();
      const outsider = await registerUser({ role: 'CLIENT' });
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;

      const asClient = await request(app).get(`/api/rides/${rideId}`).set(authHeader(client.accessToken));
      expect(asClient.status).toBe(200);

      const asOutsider = await request(app).get(`/api/rides/${rideId}`).set(authHeader(outsider.accessToken));
      expect(asOutsider.status).toBe(403);
    });

    it('GET /api/rides/active reflects the current non-terminal ride, then null once it ends', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const created = await requestRide(client.accessToken);
      const rideId = created.body.data.id;

      const active = await request(app).get('/api/rides/active').set(authHeader(client.accessToken));
      expect(active.body.data.id).toBe(rideId);

      await request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(client.accessToken));
      const afterCancel = await request(app).get('/api/rides/active').set(authHeader(client.accessToken));
      expect(afterCancel.body.data).toBeNull();
    });
  });

  describe('GET /api/rides/estimate', () => {
    it('returns a distance/duration/fare preview without creating a ride', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app)
        .get('/api/rides/estimate')
        .query(RIDE_PAYLOAD)
        .set(authHeader(client.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.data.distanceKm).toBeGreaterThan(0);
      expect(res.body.data.estimatedFare).toBeGreaterThan(0);

      const active = await request(app).get('/api/rides/active').set(authHeader(client.accessToken));
      expect(active.body.data).toBeNull();
    });

    it('rejects an invalid payload', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app)
        .get('/api/rides/estimate')
        .query({ pickupLat: 999, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 })
        .set(authHeader(client.accessToken));

      expect(res.status).toBe(400);
    });
  });
});
