jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function advance(rideId, action, accessToken) {
  return request(app).patch(`/api/rides/${rideId}/${action}`).set(authHeader(accessToken));
}

async function completeRide() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
  const rideId = created.body.data.id;
  await advance(rideId, 'accept', driver.accessToken);
  await advance(rideId, 'arrive', driver.accessToken);
  await advance(rideId, 'start', driver.accessToken);
  await advance(rideId, 'complete', driver.accessToken);
  return { client, driver, rideId };
}

describe('ratings', () => {
  it('rejects rating a ride that is not completed', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });
    const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
    const rideId = created.body.data.id;
    await advance(rideId, 'accept', driver.accessToken);

    const res = await request(app).post(`/api/rides/${rideId}/rate`).set(authHeader(client.accessToken)).send({ rating: 5 });
    expect(res.status).toBe(409);
  });

  it('lets the client rate the driver and updates the driver running average', async () => {
    const { client, driver, rideId } = await completeRide();

    const res = await request(app)
      .post(`/api/rides/${rideId}/rate`)
      .set(authHeader(client.accessToken))
      .send({ rating: 4, comment: 'Good ride' });
    expect(res.status).toBe(200);
    expect(res.body.data.driverRating).toBe(4);

    const driverProfile = await request(app).get('/api/users/me').set(authHeader(driver.accessToken));
    expect(driverProfile.body.data.ratingAverage).toBe(4);
    expect(driverProfile.body.data.ratingCount).toBe(1);
  });

  it('averages across multiple completed rides for the same driver', async () => {
    const first = await completeRide();
    await request(app).post(`/api/rides/${first.rideId}/rate`).set(authHeader(first.client.accessToken)).send({ rating: 4 });

    const secondClient = await registerUser({ role: 'CLIENT' });
    const created = await request(app).post('/api/rides').set(authHeader(secondClient.accessToken)).send(RIDE_PAYLOAD);
    const rideId2 = created.body.data.id;
    await advance(rideId2, 'accept', first.driver.accessToken);
    await advance(rideId2, 'arrive', first.driver.accessToken);
    await advance(rideId2, 'start', first.driver.accessToken);
    await advance(rideId2, 'complete', first.driver.accessToken);
    await request(app).post(`/api/rides/${rideId2}/rate`).set(authHeader(secondClient.accessToken)).send({ rating: 2 });

    const driverProfile = await request(app).get('/api/users/me').set(authHeader(first.driver.accessToken));
    expect(driverProfile.body.data.ratingAverage).toBe(3);
    expect(driverProfile.body.data.ratingCount).toBe(2);
  });

  it('rejects rating the same ride twice from the same side', async () => {
    const { client, rideId } = await completeRide();
    await request(app).post(`/api/rides/${rideId}/rate`).set(authHeader(client.accessToken)).send({ rating: 5 });
    const res = await request(app).post(`/api/rides/${rideId}/rate`).set(authHeader(client.accessToken)).send({ rating: 3 });
    expect(res.status).toBe(409);
  });

  it('rejects a non-participant rating a ride', async () => {
    const { rideId } = await completeRide();
    const outsider = await registerUser({ role: 'CLIENT' });
    const res = await request(app).post(`/api/rides/${rideId}/rate`).set(authHeader(outsider.accessToken)).send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects an out-of-range rating value', async () => {
    const { client, rideId } = await completeRide();
    const res = await request(app).post(`/api/rides/${rideId}/rate`).set(authHeader(client.accessToken)).send({ rating: 6 });
    expect(res.status).toBe(400);
  });
});
