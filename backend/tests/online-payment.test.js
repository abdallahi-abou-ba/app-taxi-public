jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));

// Identifiers prefixed with "mock" are allowed inside a jest.mock() factory
// despite Jest's hoisting (see babel-plugin-jest-hoist) - this stands in for
// the real Stripe SDK so these tests never make a real network call.
const mockSessionsCreate = jest.fn();
const mockConstructEvent = jest.fn();
jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionsCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  }))
);

const request = require('supertest');
const env = require('../src/config/env');
const { app, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };
const REDIRECT_URLS = { successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' };

async function advance(rideId, action, accessToken) {
  return request(app).patch(`/api/rides/${rideId}/${action}`).set(authHeader(accessToken));
}

async function completeRideWithMethod(paymentMethod) {
  const client = await registerUser({ role: 'CLIENT' });
  const driver = await registerUser({ role: 'DRIVER' });
  const created = await request(app)
    .post('/api/rides')
    .set(authHeader(client.accessToken))
    .send({ ...RIDE_PAYLOAD, paymentMethod });
  const rideId = created.body.data.id;
  await advance(rideId, 'accept', driver.accessToken);
  await advance(rideId, 'arrive', driver.accessToken);
  await advance(rideId, 'start', driver.accessToken);
  await advance(rideId, 'complete', driver.accessToken);
  return { client, driver, rideId };
}

const completeCardRide = () => completeRideWithMethod('CARD');
const completeCashRide = () => completeRideWithMethod('CASH');

describe('online card payment (Stripe Checkout)', () => {
  beforeEach(() => {
    mockSessionsCreate.mockReset();
    mockConstructEvent.mockReset();
  });

  it('returns 503 when Stripe is not configured', async () => {
    const original = env.STRIPE_SECRET_KEY;
    env.STRIPE_SECRET_KEY = undefined;
    const { client, rideId } = await completeCardRide();
    const res = await request(app)
      .post(`/api/rides/${rideId}/checkout-session`)
      .set(authHeader(client.accessToken))
      .send(REDIRECT_URLS);
    expect(res.status).toBe(503);
    env.STRIPE_SECRET_KEY = original;
  });

  describe('with Stripe configured', () => {
    let originalKey;
    let originalWebhookSecret;
    beforeAll(() => {
      originalKey = env.STRIPE_SECRET_KEY;
      originalWebhookSecret = env.STRIPE_WEBHOOK_SECRET;
      env.STRIPE_SECRET_KEY = 'sk_test_fake';
      // The "already paid" test below drives the ride into that state via a
      // direct webhook call, which also needs this configured.
      env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
    });
    afterAll(() => {
      env.STRIPE_SECRET_KEY = originalKey;
      env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    });

    it('creates a checkout session and returns its URL', async () => {
      mockSessionsCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/pay/cs_test_123' });
      const { client, rideId } = await completeCardRide();

      const res = await request(app)
        .post(`/api/rides/${rideId}/checkout-session`)
        .set(authHeader(client.accessToken))
        .send(REDIRECT_URLS);

      expect(res.status).toBe(200);
      expect(res.body.data.url).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(mockSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ success_url: REDIRECT_URLS.successUrl, cancel_url: REDIRECT_URLS.cancelUrl })
      );
    });

    it('rejects a CASH ride', async () => {
      const { client, rideId } = await completeCashRide();
      const res = await request(app)
        .post(`/api/rides/${rideId}/checkout-session`)
        .set(authHeader(client.accessToken))
        .send(REDIRECT_URLS);
      expect(res.status).toBe(409);
    });

    it('rejects the driver trying to pay for the ride', async () => {
      const { driver, rideId } = await completeCardRide();
      const res = await request(app)
        .post(`/api/rides/${rideId}/checkout-session`)
        .set(authHeader(driver.accessToken))
        .send(REDIRECT_URLS);
      expect(res.status).toBe(403);
    });

    it('rejects a ride that is already paid', async () => {
      const { client, rideId } = await completeCardRide();
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { rideId }, payment_intent: 'pi_test_1' } },
      });
      await request(app).post('/api/webhooks/stripe').set('stripe-signature', 't').send(Buffer.from('{}'));

      const res = await request(app)
        .post(`/api/rides/${rideId}/checkout-session`)
        .set(authHeader(client.accessToken))
        .send(REDIRECT_URLS);
      expect(res.status).toBe(409);
    });
  });

  describe('webhook', () => {
    let originalKey;
    let originalWebhookSecret;
    beforeAll(() => {
      originalKey = env.STRIPE_SECRET_KEY;
      originalWebhookSecret = env.STRIPE_WEBHOOK_SECRET;
      env.STRIPE_SECRET_KEY = 'sk_test_fake';
      env.STRIPE_WEBHOOK_SECRET = 'whsec_fake';
    });
    afterAll(() => {
      env.STRIPE_SECRET_KEY = originalKey;
      env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    });

    it('marks a ride paid on checkout.session.completed', async () => {
      const { rideId, client } = await completeCardRide();
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { rideId }, payment_intent: 'pi_test_2' } },
      });

      const webhookRes = await request(app).post('/api/webhooks/stripe').set('stripe-signature', 't').send(Buffer.from('{}'));
      expect(webhookRes.status).toBe(200);

      const ride = await request(app).get(`/api/rides/${rideId}`).set(authHeader(client.accessToken));
      expect(ride.body.data.isPaid).toBe(true);
      expect(ride.body.data.stripePaymentIntentId).toBe('pi_test_2');
    });

    it('is idempotent when the same event is delivered twice', async () => {
      const { rideId, client } = await completeCardRide();
      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { rideId }, payment_intent: 'pi_test_3' } },
      });

      await request(app).post('/api/webhooks/stripe').set('stripe-signature', 't').send(Buffer.from('{}'));
      await request(app).post('/api/webhooks/stripe').set('stripe-signature', 't').send(Buffer.from('{}'));

      const res = await request(app).get(`/api/rides/${rideId}`).set(authHeader(client.accessToken));
      expect(res.body.data.isPaid).toBe(true);
      expect(res.body.data.stripePaymentIntentId).toBe('pi_test_3');
    });

    it('rejects an invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('bad signature');
      });
      const res = await request(app).post('/api/webhooks/stripe').set('stripe-signature', 'bad').send(Buffer.from('{}'));
      expect(res.status).toBe(400);
    });
  });
});
