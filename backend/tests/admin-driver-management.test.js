jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

describe('admin driver management', () => {
  describe('driver detail', () => {
    it('returns driver profile with aggregated stats', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const res = await request(app).get(`/api/admin/drivers/${driver.user.id}`).set(authHeader(admin.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(driver.user.id);
      expect(res.body.data.stats).toMatchObject({
        completedRides: 0,
        cancelledRides: 0,
        totalRevenue: 0,
        totalCommission: 0,
        totalNetEarnings: 0,
      });
    });

    it('404s for a client id', async () => {
      const admin = await createAdmin();
      const client = await registerUser({ role: 'CLIENT' });

      const res = await request(app).get(`/api/admin/drivers/${client.user.id}`).set(authHeader(admin.accessToken));
      expect(res.status).toBe(404);
    });

    it('rejects a non-admin caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app).get(`/api/admin/drivers/${client.user.id}`).set(authHeader(client.accessToken));
      expect(res.status).toBe(403);
    });
  });

  describe('creating a driver', () => {
    it('lets an admin create a driver directly, defaulting to PENDING with the default commission rate', async () => {
      const admin = await createAdmin();

      const res = await request(app)
        .post('/api/admin/drivers')
        .set(authHeader(admin.accessToken))
        .send({
          email: 'admin-created-driver@test.local',
          password: 'password123',
          fullName: 'Admin Created Driver',
          vehiclePlate: '9999-ZZ-01',
          initialBalance: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.approvalStatus).toBe('PENDING');
      expect(res.body.data.commissionRate).toBeCloseTo(0.2);
      expect(res.body.data.initialBalance).toBe(50);
    });

    it('rejects a duplicate email', async () => {
      const admin = await createAdmin();
      const existing = await registerUser({ role: 'CLIENT' });

      const res = await request(app)
        .post('/api/admin/drivers')
        .set(authHeader(admin.accessToken))
        .send({
          email: existing.user.email,
          password: 'password123',
          fullName: 'Dup',
          vehiclePlate: '1111-AA-01',
        });

      expect(res.status).toBe(409);
    });

    it('rejects a non-admin caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app)
        .post('/api/admin/drivers')
        .set(authHeader(client.accessToken))
        .send({ email: 'x@test.local', password: 'password123', fullName: 'X', vehiclePlate: '1-A-1' });
      expect(res.status).toBe(403);
    });
  });

  describe('editing a driver', () => {
    it('lets an admin update profile fields', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const res = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}`)
        .set(authHeader(admin.accessToken))
        .send({ address: '123 Main St', nationalId: 'ID-1', contractType: 'full-time' });

      expect(res.status).toBe(200);
      expect(res.body.data.address).toBe('123 Main St');
      expect(res.body.data.nationalId).toBe('ID-1');
      expect(res.body.data.contractType).toBe('full-time');
    });
  });

  describe('status lifecycle', () => {
    it('walks a driver through APPROVED -> SUSPENDED -> APPROVED -> BLOCKED', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const suspend = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'SUSPENDED' });
      expect(suspend.status).toBe(200);
      expect(suspend.body.data.approvalStatus).toBe('SUSPENDED');

      // A suspended driver is blocked from going online, same as PENDING.
      const online = await request(app)
        .patch('/api/users/me/availability')
        .set(authHeader(driver.accessToken))
        .send({ isAvailable: true, currentLat: 33.5731, currentLng: -7.5898 });
      expect(online.status).toBe(403);

      const reactivate = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'APPROVED' });
      expect(reactivate.status).toBe(200);
      expect(reactivate.body.data.approvalStatus).toBe('APPROVED');

      const block = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'BLOCKED' });
      expect(block.status).toBe(200);
      expect(block.body.data.approvalStatus).toBe('BLOCKED');
    });

    it('rejects a non-admin caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const driver = await registerUser({ role: 'DRIVER' });
      const res = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(client.accessToken))
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(403);
    });
  });

  describe('archiving a driver', () => {
    it('soft-deletes and revokes sessions', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const res = await request(app).delete(`/api/admin/drivers/${driver.user.id}`).set(authHeader(admin.accessToken));
      expect(res.status).toBe(200);

      const stillListed = await request(app)
        .get(`/api/admin/drivers/${driver.user.id}`)
        .set(authHeader(admin.accessToken));
      expect(stillListed.body.data.deletedAt).not.toBeNull();

      const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: driver.refreshToken });
      expect(refresh.status).toBe(401);
    });
  });
});
