// Split out from admin-driver-management.test.js: kept in its own file so
// its auth-route calls (login/refresh, on top of every registerUser/
// createAdmin) stay under authRateLimiter's 20-per-15min budget, which is
// scoped per test file (each file gets a fresh module registry, so a fresh
// rate-limiter instance).
const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

describe('admin driver management - BLOCKED enforcement and commission rate', () => {
  describe('BLOCKED enforcement', () => {
    it('denies login for a blocked driver', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'BLOCKED' });

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: driver.user.email, password: 'password123' });
      expect(login.status).toBe(403);
    });

    it('rejects an already-issued access token immediately once blocked (no need to wait for expiry)', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      // Token issued while still APPROVED.
      const meBefore = await request(app).get('/api/users/me').set(authHeader(driver.accessToken));
      expect(meBefore.status).toBe(200);

      await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'BLOCKED' });

      const meAfter = await request(app).get('/api/users/me').set(authHeader(driver.accessToken));
      expect(meAfter.status).toBe(403);
    });

    it('denies token refresh for a blocked driver', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/status`)
        .set(authHeader(admin.accessToken))
        .send({ status: 'BLOCKED' });

      const refresh = await request(app).post('/api/auth/refresh').send({ refreshToken: driver.refreshToken });
      expect(refresh.status).toBe(403);
    });
  });

  describe('commission rate', () => {
    it('changes a driver rate and records history', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const changed = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/commission-rate`)
        .set(authHeader(admin.accessToken))
        .send({ newRate: 0.15, reason: 'Loyalty discount' });
      expect(changed.status).toBe(200);
      expect(changed.body.data.commissionRate).toBeCloseTo(0.15);

      const history = await request(app)
        .get(`/api/admin/drivers/${driver.user.id}/commission-history`)
        .set(authHeader(admin.accessToken));
      expect(history.status).toBe(200);
      expect(history.body.data).toHaveLength(1);
      expect(history.body.data[0]).toMatchObject({ oldRate: 0.2, newRate: 0.15, reason: 'Loyalty discount' });
    });

    it('rejects an out-of-range rate', async () => {
      const admin = await createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const res = await request(app)
        .patch(`/api/admin/drivers/${driver.user.id}/commission-rate`)
        .set(authHeader(admin.accessToken))
        .send({ newRate: 1.5 });
      expect(res.status).toBe(400);
    });
  });
});
