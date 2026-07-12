jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

describe('DELETE /api/users/me', () => {
  it('anonymizes the account, revokes tokens, and frees the email for reuse', async () => {
    const { user, accessToken } = await registerUser({ email: 'deleteme@test.local', password: 'password123' });

    const res = await request(app).delete('/api/users/me').set(authHeader(accessToken)).send({ password: 'password123' });
    expect(res.status).toBe(200);

    const afterDelete = await request(app).get('/api/users/me').set(authHeader(accessToken));
    expect(afterDelete.status).toBe(401);

    const reregistered = await request(app).post('/api/auth/register').send({
      email: 'deleteme@test.local',
      password: 'newpassword123',
      fullName: 'New Owner',
      role: 'CLIENT',
    });
    expect(reregistered.status).toBe(201);
    expect(reregistered.body.data.user.id).not.toBe(user.id);
  });

  it('rejects an incorrect password and leaves the account usable', async () => {
    const { accessToken } = await registerUser({ email: 'wrongpw-delete@test.local', password: 'password123' });

    const res = await request(app).delete('/api/users/me').set(authHeader(accessToken)).send({ password: 'notmypassword' });
    expect(res.status).toBe(401);

    const login = await request(app).post('/api/auth/login').send({ email: 'wrongpw-delete@test.local', password: 'password123' });
    expect(login.status).toBe(200);
  });

  it('rejects deletion while the account has an active ride', async () => {
    const client = await registerUser({ role: 'CLIENT', email: 'active-ride-client@test.local', password: 'password123' });
    await registerUser({ role: 'DRIVER', email: 'active-ride-driver@test.local' });
    await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);

    const res = await request(app)
      .delete('/api/users/me')
      .set(authHeader(client.accessToken))
      .send({ password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('prevents logging in with the old credentials after deletion', async () => {
    const { accessToken } = await registerUser({ email: 'gone@test.local', password: 'password123' });
    await request(app).delete('/api/users/me').set(authHeader(accessToken)).send({ password: 'password123' });

    const login = await request(app).post('/api/auth/login').send({ email: 'gone@test.local', password: 'password123' });
    expect(login.status).toBe(401);
  });
});
