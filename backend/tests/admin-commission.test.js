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

describe('commission snapshot', () => {
  it('freezes commission/net at the rate active when the ride completes, and ignores later rate changes', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    await request(app)
      .patch(`/api/admin/drivers/${driver.user.id}/commission-rate`)
      .set(authHeader(admin.accessToken))
      .send({ newRate: 0.25 });

    const ride = await completeRide(client, driver);
    expect(ride.commissionRateSnapshot).toBeCloseTo(0.25);
    expect(ride.commissionAmount).toBeCloseTo(ride.estimatedFare * 0.25, 2);
    expect(ride.driverNetAmount).toBeCloseTo(ride.estimatedFare * 0.75, 2);

    // Rate changes after the fact must not retroactively alter this ride.
    await request(app)
      .patch(`/api/admin/drivers/${driver.user.id}/commission-rate`)
      .set(authHeader(admin.accessToken))
      .send({ newRate: 0.5 });

    const refetched = await request(app).get(`/api/admin/rides/${ride.id}`).set(authHeader(admin.accessToken));
    expect(refetched.body.data.commissionRateSnapshot).toBeCloseTo(0.25);
    expect(refetched.body.data.commissionAmount).toBeCloseTo(ride.estimatedFare * 0.25, 2);
  });

  it('reflects commission totals on the global stats endpoint', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const ride = await completeRide(client, driver);

    const stats = await request(app).get('/api/admin/stats').set(authHeader(admin.accessToken));
    expect(stats.status).toBe(200);
    expect(stats.body.data.totalCommission).toBeGreaterThanOrEqual(ride.commissionAmount);
    expect(stats.body.data.totalDriverNet).toBeGreaterThanOrEqual(ride.driverNetAmount);
  });

  describe('GET /api/admin/revenue', () => {
    it('groups by driver', async () => {
      const admin = await createAdmin();
      const client = await registerUser({ role: 'CLIENT' });
      const driver = await registerUser({ role: 'DRIVER' });
      const ride = await completeRide(client, driver);

      const res = await request(app).get('/api/admin/revenue?groupBy=driver').set(authHeader(admin.accessToken));
      expect(res.status).toBe(200);
      const row = res.body.data.find((r) => r.driverId === driver.user.id);
      expect(row).toBeDefined();
      expect(row.grossRevenue).toBeGreaterThanOrEqual(ride.estimatedFare);
      expect(row.rideCount).toBeGreaterThanOrEqual(1);
    });

    it('groups by day', async () => {
      const admin = await createAdmin();
      const client = await registerUser({ role: 'CLIENT' });
      const driver = await registerUser({ role: 'DRIVER' });
      await completeRide(client, driver);

      const res = await request(app).get('/api/admin/revenue?groupBy=day').set(authHeader(admin.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('grossRevenue');
    });

    it('rejects a non-admin caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app).get('/api/admin/revenue').set(authHeader(client.accessToken));
      expect(res.status).toBe(403);
    });
  });
});
