jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

// Real coordinates from src/config/demandZones.js
const KSAR = { pickupLat: 18.1049033, pickupLng: -15.9644337, destinationLat: 18.09, destinationLng: -15.96 };
const ARAFAT = { pickupLat: 18.0459512, pickupLng: -15.9632837, destinationLat: 18.05, destinationLng: -15.96 };

function requestRide(accessToken, payload) {
  return request(app).post('/api/rides').set(authHeader(accessToken)).send(payload);
}

describe('GET /api/rides/demand-zones', () => {
  it('buckets pending rides by nearest district and sorts by count desc', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const client2 = await registerUser({ role: 'CLIENT' });
    const client3 = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    await requestRide(client.accessToken, KSAR);
    await requestRide(client2.accessToken, KSAR);
    await requestRide(client3.accessToken, ARAFAT);

    const res = await request(app).get('/api/rides/demand-zones').set(authHeader(driver.accessToken));
    expect(res.status).toBe(200);

    const ksar = res.body.data.find((z) => z.name === 'Ksar');
    const arafat = res.body.data.find((z) => z.name === 'Arafat');
    expect(ksar.count).toBe(2);
    expect(arafat.count).toBe(1);
    expect(res.body.data[0].name).toBe('Ksar');

    // Every configured zone is present, even with a zero count.
    expect(res.body.data.length).toBe(9);
  });

  it('rejects a client', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/rides/demand-zones').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });
});
