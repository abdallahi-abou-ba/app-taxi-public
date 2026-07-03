jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, authHeader } = require('./helpers');
const { sendPushToUser } = require('../src/utils/push.util');
const { remindStillSearching, remindUnratedRides } = require('../src/jobs/reminder.job');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

function requestRide(accessToken) {
  return request(app).post('/api/rides').set(authHeader(accessToken)).send(RIDE_PAYLOAD);
}

async function completeARide() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await requestRide(client.accessToken);
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
  return { client, driver, rideId };
}

beforeEach(() => {
  sendPushToUser.mockClear();
});

describe('remindStillSearching', () => {
  it('reminds the client once a REQUESTED ride has been waiting long enough', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    await prisma.ride.update({ where: { id: rideId }, data: { requestedAt: new Date(Date.now() - 10 * 60 * 1000) } });

    await remindStillSearching();

    expect(sendPushToUser).toHaveBeenCalledWith(
      client.user.id,
      expect.objectContaining({ data: expect.objectContaining({ rideId, type: 'ride:search-reminder' }) })
    );
    const updated = await prisma.ride.findUnique({ where: { id: rideId } });
    expect(updated.searchReminderSentAt).not.toBeNull();
  });

  it('does not remind a ride that has not been waiting long enough', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;

    await remindStillSearching();

    expect(sendPushToUser).not.toHaveBeenCalled();
    const updated = await prisma.ride.findUnique({ where: { id: rideId } });
    expect(updated.searchReminderSentAt).toBeNull();
  });

  it('only reminds once even if the check runs again', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const created = await requestRide(client.accessToken);
    const rideId = created.body.data.id;
    await prisma.ride.update({ where: { id: rideId }, data: { requestedAt: new Date(Date.now() - 10 * 60 * 1000) } });

    await remindStillSearching();
    await remindStillSearching();

    expect(sendPushToUser).toHaveBeenCalledTimes(1);
  });
});

describe('remindUnratedRides', () => {
  it('reminds both sides when neither has rated an old completed ride', async () => {
    const { client, driver, rideId } = await completeARide();
    await prisma.ride.update({ where: { id: rideId }, data: { completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });

    sendPushToUser.mockClear();
    await remindUnratedRides();

    expect(sendPushToUser).toHaveBeenCalledWith(
      client.user.id,
      expect.objectContaining({ data: expect.objectContaining({ rideId, type: 'ride:rating-reminder' }) })
    );
    expect(sendPushToUser).toHaveBeenCalledWith(
      driver.user.id,
      expect.objectContaining({ data: expect.objectContaining({ rideId, type: 'ride:rating-reminder' }) })
    );
    const updated = await prisma.ride.findUnique({ where: { id: rideId } });
    expect(updated.ratingReminderSentAt).not.toBeNull();
  });

  it('only reminds the side that has not rated yet', async () => {
    const { client, driver, rideId } = await completeARide();
    await request(app).post(`/api/rides/${rideId}/rate`).set(authHeader(client.accessToken)).send({ rating: 5 });
    await prisma.ride.update({ where: { id: rideId }, data: { completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) } });

    sendPushToUser.mockClear();
    await remindUnratedRides();

    expect(sendPushToUser).not.toHaveBeenCalledWith(client.user.id, expect.anything());
    expect(sendPushToUser).toHaveBeenCalledWith(
      driver.user.id,
      expect.objectContaining({ data: expect.objectContaining({ type: 'ride:rating-reminder' }) })
    );
  });

  it('does not remind a recently completed ride', async () => {
    const { rideId } = await completeARide();

    sendPushToUser.mockClear();
    await remindUnratedRides();

    expect(sendPushToUser).not.toHaveBeenCalled();
    const updated = await prisma.ride.findUnique({ where: { id: rideId } });
    expect(updated.ratingReminderSentAt).toBeNull();
  });
});
