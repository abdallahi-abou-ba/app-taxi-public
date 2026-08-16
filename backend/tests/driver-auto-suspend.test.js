jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function requestAndAccept(client, driver) {
  const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
  expect(created.status).toBe(201);
  const accepted = await request(app)
    .patch(`/api/rides/${created.body.data.id}/accept`)
    .set(authHeader(driver.accessToken));
  expect(accepted.status).toBe(200);
  return created.body.data.id;
}

async function cancelAsDriver(driver, rideId) {
  return request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(driver.accessToken)).send({ reason: 'test' });
}

describe('driver auto-suspend after consecutive cancellations', () => {
  it('suspends the driver after 5 consecutive cancellations and blocks going online/accepting', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    for (let i = 0; i < 5; i += 1) {
      const rideId = await requestAndAccept(client, driver);
      const cancelled = await cancelAsDriver(driver, rideId);
      expect(cancelled.status).toBe(200);
    }

    const updatedDriver = await prisma.user.findUnique({ where: { id: driver.user.id } });
    expect(updatedDriver.cancelStreak).toBe(0);
    expect(updatedDriver.autoSuspendedUntil).not.toBeNull();
    expect(updatedDriver.autoSuspendedUntil.getTime()).toBeGreaterThan(Date.now());

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

  it('resets the streak once the driver completes a ride, so it takes 5 in a row again', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    for (let i = 0; i < 4; i += 1) {
      const rideId = await requestAndAccept(client, driver);
      await cancelAsDriver(driver, rideId);
    }

    const midStreakDriver = await prisma.user.findUnique({ where: { id: driver.user.id } });
    expect(midStreakDriver.cancelStreak).toBe(4);

    const completedRideId = await requestAndAccept(client, driver);
    const completeFlow = [
      request(app).patch(`/api/rides/${completedRideId}/arrive`).set(authHeader(driver.accessToken)),
      request(app).patch(`/api/rides/${completedRideId}/start`).set(authHeader(driver.accessToken)),
      request(app).patch(`/api/rides/${completedRideId}/complete`).set(authHeader(driver.accessToken)),
    ];
    for (const step of completeFlow) {
      const res = await step;
      expect(res.status).toBe(200);
    }

    const resetDriver = await prisma.user.findUnique({ where: { id: driver.user.id } });
    expect(resetDriver.cancelStreak).toBe(0);

    for (let i = 0; i < 4; i += 1) {
      const rideId = await requestAndAccept(client, driver);
      await cancelAsDriver(driver, rideId);
    }

    const stillNotSuspended = await prisma.user.findUnique({ where: { id: driver.user.id } });
    expect(stillNotSuspended.cancelStreak).toBe(4);
    expect(stillNotSuspended.autoSuspendedUntil).toBeNull();
  });

  it('applies the admin-configured suspension duration', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const settings = await request(app)
      .patch('/api/admin/settings')
      .set(authHeader(admin.accessToken))
      .send({ driverAutoSuspendHours: 2 });
    expect(settings.status).toBe(200);
    expect(settings.body.data.driverAutoSuspendHours).toBe(2);

    for (let i = 0; i < 5; i += 1) {
      const rideId = await requestAndAccept(client, driver);
      await cancelAsDriver(driver, rideId);
    }

    const updatedDriver = await prisma.user.findUnique({ where: { id: driver.user.id } });
    const expectedUntil = Date.now() + 2 * 3600000;
    expect(updatedDriver.autoSuspendedUntil.getTime()).toBeGreaterThan(Date.now() + 1.9 * 3600000);
    expect(updatedDriver.autoSuspendedUntil.getTime()).toBeLessThan(expectedUntil + 60000);
  });

  it('falls back to the env default when no admin override has been saved', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    for (let i = 0; i < 5; i += 1) {
      const rideId = await requestAndAccept(client, driver);
      await cancelAsDriver(driver, rideId);
    }

    const updatedDriver = await prisma.user.findUnique({ where: { id: driver.user.id } });
    // DRIVER_AUTO_SUSPEND_HOURS defaults to 24 in env.js and .env.test doesn't
    // override it, so an unconfigured deployment still gets a real suspension.
    expect(updatedDriver.autoSuspendedUntil.getTime()).toBeGreaterThan(Date.now() + 23 * 3600000);
  });

  it('exposes cancelStreak and autoSuspendedUntil on the admin driver detail view', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const rideId = await requestAndAccept(client, driver);
    await cancelAsDriver(driver, rideId);

    const detail = await request(app).get(`/api/admin/drivers/${driver.user.id}`).set(authHeader(admin.accessToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.cancelStreak).toBe(1);
    expect(detail.body.data.autoSuspendedUntil).toBeNull();
  });
});
