jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

describe('booking a ride for someone else', () => {
  it('round-trips passengerName/passengerPhone when provided', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app)
      .post('/api/rides')
      .set(authHeader(client.accessToken))
      .send({ ...RIDE_PAYLOAD, passengerName: 'Fatima Mint Sidi', passengerPhone: '22345678' });

    expect(res.status).toBe(201);
    expect(res.body.data.passengerName).toBe('Fatima Mint Sidi');
    expect(res.body.data.passengerPhone).toBe('22345678');
  });

  it('leaves passengerName/passengerPhone null when not provided', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);

    expect(res.status).toBe(201);
    expect(res.body.data.passengerName).toBeNull();
    expect(res.body.data.passengerPhone).toBeNull();
  });

  it('rejects a passenger phone shorter than 6 characters', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app)
      .post('/api/rides')
      .set(authHeader(client.accessToken))
      .send({ ...RIDE_PAYLOAD, passengerName: 'Fatima', passengerPhone: '123' });

    expect(res.status).toBe(400);
  });
});
