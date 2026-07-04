jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');
const { sendPushToUser } = require('../src/utils/push.util');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function makeRide() {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await request(app).post('/api/rides').set(authHeader(client.accessToken)).send(RIDE_PAYLOAD);
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
  return { client, driver, rideId };
}

beforeEach(() => {
  sendPushToUser.mockClear();
});

describe('POST /api/rides/:id/messages', () => {
  it('lets a participant send a message and both sides can list it', async () => {
    const { client, driver, rideId } = await makeRide();

    const sent = await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken)).send({ body: 'On my way!' });
    expect(sent.status).toBe(201);
    expect(sent.body.data.body).toBe('On my way!');
    expect(sent.body.data.sender.id).toBe(client.user.id);

    const asClient = await request(app).get(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken));
    const asDriver = await request(app).get(`/api/rides/${rideId}/messages`).set(authHeader(driver.accessToken));
    expect(asClient.body.data).toHaveLength(1);
    expect(asDriver.body.data).toHaveLength(1);
  });

  it('notifies the recipient, not the sender', async () => {
    const { client, driver, rideId } = await makeRide();

    sendPushToUser.mockClear();
    await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken)).send({ body: 'Hello driver' });

    expect(sendPushToUser).toHaveBeenCalledWith(driver.user.id, expect.objectContaining({ data: expect.objectContaining({ type: 'chat:message' }) }));
    expect(sendPushToUser).not.toHaveBeenCalledWith(client.user.id, expect.anything());
  });

  it('preserves chronological order across multiple messages', async () => {
    const { client, driver, rideId } = await makeRide();

    await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken)).send({ body: 'first' });
    await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(driver.accessToken)).send({ body: 'second' });
    await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken)).send({ body: 'third' });

    const res = await request(app).get(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken));
    expect(res.body.data.map((m) => m.body)).toEqual(['first', 'second', 'third']);
  });

  it('rejects an empty message', async () => {
    const { client, rideId } = await makeRide();
    const res = await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(client.accessToken)).send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  it('rejects a non-participant from sending or listing', async () => {
    const { rideId } = await makeRide();
    const outsider = await registerUser({ role: 'CLIENT' });

    const sendRes = await request(app).post(`/api/rides/${rideId}/messages`).set(authHeader(outsider.accessToken)).send({ body: 'hi' });
    expect(sendRes.status).toBe(403);

    const listRes = await request(app).get(`/api/rides/${rideId}/messages`).set(authHeader(outsider.accessToken));
    expect(listRes.status).toBe(403);
  });
});
