jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

describe('minimum balance to go online', () => {
  it('blocks an approved driver below the configured minimum balance from going online or accepting a ride', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const settings = await request(app)
      .patch('/api/admin/settings')
      .set(authHeader(admin.accessToken))
      .send({ minBalanceToGoOnline: 100 });
    expect(settings.status).toBe(200);
    expect(settings.body.data.minBalanceToGoOnline).toBe(100);

    const online = await request(app)
      .patch('/api/users/me/availability')
      .set(authHeader(driver.accessToken))
      .send({ isAvailable: true, currentLat: 33.5731, currentLng: -7.5898 });
    expect(online.status).toBe(403);

    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    const accepted = await request(app)
      .patch(`/api/rides/${created.body.data.id}/accept`)
      .set(authHeader(driver.accessToken));
    expect(accepted.status).toBe(403);
  });

  it('lets the driver through once their balance meets the configured minimum', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    await request(app)
      .patch('/api/admin/settings')
      .set(authHeader(admin.accessToken))
      .send({ minBalanceToGoOnline: 100 });
    await prisma.user.update({ where: { id: driver.user.id }, data: { creditBalance: 100 } });

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
  });

  it('falls back to the env default when no admin override has been saved', async () => {
    const driver = await registerUser({ role: 'DRIVER' });

    const online = await request(app)
      .patch('/api/users/me/availability')
      .set(authHeader(driver.accessToken))
      .send({ isAvailable: true, currentLat: 33.5731, currentLng: -7.5898 });
    // MIN_BALANCE_TO_GO_ONLINE=0 in .env.test, and a freshly-registered driver
    // has creditBalance 0, so 0 >= 0 should pass without any admin override.
    expect(online.status).toBe(200);
  });
});
