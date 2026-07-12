jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

describe('admin ride visibility', () => {
  it('rejects a non-admin caller', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/rides').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('lists rides with pagination metadata', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);

    const res = await request(app).get('/api/admin/rides?pageSize=1').set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 1 });
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it('filters by driverId, status, and paymentMethod', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    await request(app).patch(`/api/rides/${created.body.data.id}/accept`).set(authHeader(driver.accessToken));

    const res = await request(app)
      .get(`/api/admin/rides?driverId=${driver.user.id}&status=ACCEPTED&paymentMethod=CASH`)
      .set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(created.body.data.id);
  });

  it('fetches a ride detail without a participant check', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);

    const res = await request(app).get(`/api/admin/rides/${created.body.data.id}`).set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  it('404s for an unknown ride id', async () => {
    const admin = await createAdmin();
    const res = await request(app)
      .get('/api/admin/rides/00000000-0000-0000-0000-000000000000')
      .set(authHeader(admin.accessToken));
    expect(res.status).toBe(404);
  });
});
