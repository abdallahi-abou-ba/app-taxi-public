// Same OSRM mock as rides.test.js - keeps ride creation fast/deterministic
// without depending on the public OSRM demo server's uptime.
jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

describe('driver approval', () => {
  describe('registration', () => {
    it('rejects a driver registration without a vehicle plate', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'no-plate@test.local',
        password: 'password123',
        fullName: 'No Plate',
        role: 'DRIVER',
      });
      expect(res.status).toBe(400);
    });

    it('creates a driver in PENDING status requiring admin approval', async () => {
      const driver = await registerUser({ role: 'DRIVER', skipApproval: true });
      expect(driver.user.approvalStatus).toBe('PENDING');
      expect(driver.user.vehiclePlate).toBe('1234-AB-01');
    });

    it('does not require a vehicle plate for a client', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      expect(client.user.approvalStatus).toBeNull();
    });
  });

  describe('gating an unapproved driver', () => {
    it('blocks a PENDING driver from going online', async () => {
      const driver = await registerUser({ role: 'DRIVER', skipApproval: true });
      const res = await request(app)
        .patch('/api/users/me/availability')
        .set(authHeader(driver.accessToken))
        .send({ isAvailable: true, currentLat: 33.5731, currentLng: -7.5898 });
      expect(res.status).toBe(403);
    });

    it('blocks a PENDING driver from accepting a ride', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const driver = await registerUser({ role: 'DRIVER', skipApproval: true });
      const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
      const rideId = created.body.data.id;

      const res = await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('admin routes', () => {
    it('rejects a non-admin caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app).get('/api/admin/drivers').set(authHeader(client.accessToken));
      expect(res.status).toBe(403);
    });

    it('lets an admin list, approve, and reject drivers', async () => {
      const admin = await createAdmin();
      const toApprove = await registerUser({ role: 'DRIVER', skipApproval: true });
      const toReject = await registerUser({ role: 'DRIVER', skipApproval: true });

      const pending = await request(app).get('/api/admin/drivers?status=PENDING').set(authHeader(admin.accessToken));
      expect(pending.status).toBe(200);
      const pendingIds = pending.body.data.map((d) => d.id);
      expect(pendingIds).toEqual(expect.arrayContaining([toApprove.user.id, toReject.user.id]));

      const approved = await request(app)
        .patch(`/api/admin/drivers/${toApprove.user.id}/approve`)
        .set(authHeader(admin.accessToken));
      expect(approved.status).toBe(200);
      expect(approved.body.data.approvalStatus).toBe('APPROVED');

      const rejected = await request(app)
        .patch(`/api/admin/drivers/${toReject.user.id}/reject`)
        .set(authHeader(admin.accessToken));
      expect(rejected.status).toBe(200);
      expect(rejected.body.data.approvalStatus).toBe('REJECTED');
    });

    it('lets an admin list clients', async () => {
      const admin = await createAdmin();
      const client = await registerUser({ role: 'CLIENT' });

      const res = await request(app).get('/api/admin/clients').set(authHeader(admin.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.map((c) => c.id)).toContain(client.user.id);
    });
  });

  describe('global stats', () => {
    it('rejects a non-admin caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app).get('/api/admin/stats').set(authHeader(client.accessToken));
      expect(res.status).toBe(403);
    });

    it('reports client/driver counts and reflects an approval decision', async () => {
      const admin = await createAdmin();
      await registerUser({ role: 'CLIENT' });
      const driver = await registerUser({ role: 'DRIVER', skipApproval: true });

      const before = await request(app).get('/api/admin/stats').set(authHeader(admin.accessToken));
      expect(before.status).toBe(200);
      expect(before.body.data.totalClients).toBe(1);
      expect(before.body.data.totalDrivers).toBe(1);
      expect(before.body.data.driversPending).toBe(1);
      expect(before.body.data.driversApproved).toBe(0);

      await request(app).patch(`/api/admin/drivers/${driver.user.id}/approve`).set(authHeader(admin.accessToken));

      const after = await request(app).get('/api/admin/stats').set(authHeader(admin.accessToken));
      expect(after.body.data.driversPending).toBe(0);
      expect(after.body.data.driversApproved).toBe(1);
    });
  });

  describe('after approval', () => {
    it('lets a newly-approved driver go online and accept a ride', async () => {
      const admin = await createAdmin();
      const client = await registerUser({ role: 'CLIENT' });
      const driver = await registerUser({ role: 'DRIVER', skipApproval: true });

      await request(app).patch(`/api/admin/drivers/${driver.user.id}/approve`).set(authHeader(admin.accessToken));

      const online = await request(app)
        .patch('/api/users/me/availability')
        .set(authHeader(driver.accessToken))
        .send({ isAvailable: true, currentLat: 33.5731, currentLng: -7.5898 });
      expect(online.status).toBe(200);

      const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
      const accepted = await request(app)
        .patch(`/api/rides/${created.body.data.id}/accept`)
        .set(authHeader(driver.accessToken));
      expect(accepted.status).toBe(200);
      expect(accepted.body.data.status).toBe('ACCEPTED');
    });
  });
});
