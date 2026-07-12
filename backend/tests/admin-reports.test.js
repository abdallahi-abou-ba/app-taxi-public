jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function completeRide(client, driver) {
  const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
  const completed = await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
  return completed.body.data;
}

function isoRange() {
  return { from: new Date(Date.now() - 60 * 60 * 1000).toISOString(), to: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
}

describe('admin CSV report exports', () => {
  it('rejects a non-admin caller', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/reports/rides.csv').query(isoRange()).set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('requires from and to for every export', async () => {
    const admin = await createAdmin();
    const res = await request(app).get('/api/admin/reports/rides.csv').set(authHeader(admin.accessToken));
    expect(res.status).toBe(400);
  });

  it('exports a completed ride as CSV', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const ride = await completeRide(client, driver);

    const res = await request(app).get('/api/admin/reports/rides.csv').query(isoRange()).set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain(ride.id);
    expect(res.text.split('\r\n')[0]).toContain('ID');
  });

  it('exports revenue grouped by driver as CSV', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    await completeRide(client, driver);

    const res = await request(app)
      .get('/api/admin/reports/revenue.csv')
      .query({ ...isoRange(), groupBy: 'driver' })
      .set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.text).toContain(driver.user.fullName);
  });

  it('exports expenses as CSV', async () => {
    const admin = await createAdmin();
    await request(app).post('/api/admin/expenses').set(authHeader(admin.accessToken)).send({ category: 'FUEL', amount: 33 });

    const res = await request(app).get('/api/admin/reports/expenses.csv').query(isoRange()).set(authHeader(admin.accessToken));
    expect(res.status).toBe(200);
    expect(res.text).toContain('FUEL');
    expect(res.text).toContain('33');
  });
});
