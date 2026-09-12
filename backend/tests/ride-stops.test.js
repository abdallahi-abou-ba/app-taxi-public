// Unlike the other ride test files (which just force the haversine fallback
// by resolving null), this mock is aware of how many waypoints it was asked
// to route through - so a multi-stop request can be asserted to produce a
// longer route than a direct one, proving the stops actually reached OSRM.
jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn((points) =>
    Promise.resolve({
      distanceKm: (points.length - 1) * 5,
      durationMin: (points.length - 1) * 8,
      geometry: points.map((p) => [p.lat, p.lng]),
    })
  ),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };
const STOPS = [
  { lat: 33.58, lng: -7.595 },
  { lat: 33.585, lng: -7.605 },
];

describe('ride stops', () => {
  it('routes through stops and reflects the longer multi-leg distance/fare', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const direct = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    expect(direct.status).toBe(201);
    expect(direct.body.data.distanceKm).toBe(5);
    await request(app).patch(`/api/rides/${direct.body.data.id}/cancel`).set(authHeader(client.accessToken));

    const withStops = await request(app)
      .post('/api/rides')
      .set(authHeader(client.accessToken))
      .send({ ...RIDE_PAYLOAD, stops: STOPS });
    expect(withStops.status).toBe(201);
    expect(withStops.body.data.distanceKm).toBe(15);
    expect(withStops.body.data.estimatedFare).toBeGreaterThan(direct.body.data.estimatedFare);
    expect(withStops.body.data.stops).toEqual([
      { lat: STOPS[0].lat, lng: STOPS[0].lng, address: null, addressAr: null },
      { lat: STOPS[1].lat, lng: STOPS[1].lng, address: null, addressAr: null },
    ]);
  });

  it('rejects more than MAX_STOPS', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const tooMany = [...STOPS, { lat: 33.59, lng: -7.6 }, { lat: 33.595, lng: -7.61 }];

    const res = await request(app)
      .post('/api/rides')
      .set(authHeader(client.accessToken))
      .send({ ...RIDE_PAYLOAD, stops: tooMany });
    expect(res.status).toBe(400);
  });

  it('GET /api/rides/estimate accepts a JSON-encoded stops query param', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app)
      .get('/api/rides/estimate')
      .query({ ...RIDE_PAYLOAD, stops: JSON.stringify(STOPS) })
      .set(authHeader(client.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.distanceKm).toBe(15);
  });

  it('rejects a malformed stops query param', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app)
      .get('/api/rides/estimate')
      .query({ ...RIDE_PAYLOAD, stops: 'not-json' })
      .set(authHeader(client.accessToken));

    expect(res.status).toBe(400);
  });
});
