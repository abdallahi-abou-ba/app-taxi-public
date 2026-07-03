const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

describe('auth', () => {
  describe('POST /api/auth/register', () => {
    it('creates a client and returns tokens without leaking the password hash or push token', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'client@test.local',
        password: 'password123',
        fullName: 'Ada Client',
        role: 'CLIENT',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toMatchObject({ email: 'client@test.local', role: 'CLIENT' });
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.pushToken).toBeUndefined();
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      expect(res.body.data.refreshToken).toEqual(expect.any(String));
    });

    it('rejects a duplicate email', async () => {
      await registerUser({ email: 'dup@test.local' });
      const res = await request(app).post('/api/auth/register').send({
        email: 'dup@test.local',
        password: 'password123',
        fullName: 'Someone Else',
        role: 'CLIENT',
      });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects an invalid payload', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: '123',
        fullName: 'A',
        role: 'CLIENT',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
      const registered = await registerUser({ email: 'login@test.local', password: 'password123' });
      const res = await request(app).post('/api/auth/login').send({ email: 'login@test.local', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.data.user.id).toBe(registered.user.id);
    });

    it('rejects a wrong password with a generic message', async () => {
      await registerUser({ email: 'wrongpw@test.local', password: 'password123' });
      const res = await request(app).post('/api/auth/login').send({ email: 'wrongpw@test.local', password: 'nope12345' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('rejects an unknown email with the same generic message', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'ghost@test.local', password: 'password123' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates the refresh token and invalidates the old one', async () => {
      const { refreshToken } = await registerUser({ email: 'refresh@test.local' });

      const first = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(first.status).toBe(200);
      expect(first.body.data.refreshToken).not.toBe(refreshToken);

      const reuse = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(reuse.status).toBe(401);
    });

    it('rejects a garbage refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the refresh token so it can no longer be used', async () => {
      const { refreshToken } = await registerUser({ email: 'logout@test.local' });

      const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
      expect(logoutRes.status).toBe(200);

      const refreshAfter = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(refreshAfter.status).toBe(401);
    });
  });

  describe('GET /api/users/me', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/users/me');
      expect(res.status).toBe(401);
    });

    it('returns the current user without the password hash or push token', async () => {
      const { accessToken } = await registerUser({ email: 'me@test.local' });
      const res = await request(app).get('/api/users/me').set(authHeader(accessToken));
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('me@test.local');
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.pushToken).toBeUndefined();
    });
  });
});
