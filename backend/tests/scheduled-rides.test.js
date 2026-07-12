jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, authHeader } = require('./helpers');
const { sendPushToUser } = require('../src/utils/push.util');
const { activateScheduledRides } = require('../src/services/ride.service');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

function futureIso(minutesFromNow) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

function scheduleRide(accessToken, minutesFromNow = 60) {
  return request(app)
    .post('/api/rides/scheduled')
    .set(authHeader(accessToken))
    .send({ ...RIDE_PAYLOAD, scheduledFor: futureIso(minutesFromNow) });
}

describe('POST /api/rides/scheduled', () => {
  it('creates a SCHEDULED ride for a valid future time', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await scheduleRide(client.accessToken);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('SCHEDULED');
    expect(res.body.data.scheduledFor).not.toBeNull();
  });

  it('rejects a scheduledFor that is too soon', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await scheduleRide(client.accessToken, 5);
    expect(res.status).toBe(422);
  });

  it('rejects scheduling a second ride while one is already scheduled', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    await scheduleRide(client.accessToken);
    const second = await scheduleRide(client.accessToken);
    expect(second.status).toBe(409);
  });

  it('rejects an immediate request while a scheduled ride is pending', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    await scheduleRide(client.accessToken);
    const res = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    expect(res.status).toBe(409);
  });
});

describe('GET /api/rides/scheduled', () => {
  it("lists only the caller's own upcoming scheduled ride", async () => {
    const client = await registerUser({ role: 'CLIENT' });
    await scheduleRide(client.accessToken, 120);
    const other = await registerUser({ role: 'CLIENT' });
    await scheduleRide(other.accessToken, 60);

    const res = await request(app).get('/api/rides/scheduled').set(authHeader(client.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });
});

describe('SCHEDULED rides and general history', () => {
  it('is excluded from GET /api/rides', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    await scheduleRide(client.accessToken);
    const res = await request(app).get('/api/rides').set(authHeader(client.accessToken));
    expect(res.body.data.length).toBe(0);
  });

  it('can be cancelled like any other ride', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await scheduleRide(client.accessToken);
    const rideId = created.body.data.id;
    const res = await request(app).patch(`/api/rides/${rideId}/cancel`).set(authHeader(client.accessToken)).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
  });
});

describe('activateScheduledRides', () => {
  it('activates a due ride to REQUESTED and notifies a nearby available driver', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    await request(app)
      .patch('/api/users/me/availability')
      .set(authHeader(driver.accessToken))
      .send({ isAvailable: true, currentLat: RIDE_PAYLOAD.pickupLat, currentLng: RIDE_PAYLOAD.pickupLng });

    const created = await scheduleRide(client.accessToken, 60);
    const rideId = created.body.data.id;
    await prisma.ride.update({ where: { id: rideId }, data: { scheduledFor: new Date(Date.now() + 5 * 60 * 1000) } });

    sendPushToUser.mockClear();
    await activateScheduledRides();

    const updated = await prisma.ride.findUnique({ where: { id: rideId } });
    expect(updated.status).toBe('REQUESTED');
    expect(sendPushToUser).toHaveBeenCalledWith(
      driver.user.id,
      expect.objectContaining({ data: expect.objectContaining({ rideId, type: 'ride:new' }) })
    );
  });

  it('does not activate a ride whose scheduled time is still far away', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await scheduleRide(client.accessToken, 120);
    const rideId = created.body.data.id;

    await activateScheduledRides();

    const updated = await prisma.ride.findUnique({ where: { id: rideId } });
    expect(updated.status).toBe('SCHEDULED');
  });
});
