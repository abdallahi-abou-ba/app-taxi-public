jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

// See tests/online-payment.test.js for why Stripe is mocked rather than
// hitting the real network.
const mockSessionsCreate = jest.fn();
jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockSessionsCreate } },
    webhooks: { constructEvent: jest.fn() },
  }))
);

const request = require('supertest');
const env = require('../src/config/env');
const { app, registerUser, authHeader } = require('./helpers');

describe('client wallet top-up', () => {
  beforeEach(() => {
    mockSessionsCreate.mockReset();
  });

  it('exposes the minimum amount and (unset) company phone', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/users/me/wallet/topup-info').set(authHeader(client.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.minAmount).toBe(env.WALLET_TOPUP_MIN_AMOUNT);
    expect(res.body.data.companyPhone).toBeNull();
  });

  it('rejects an amount below the minimum', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(client.accessToken))
      .send({ amount: env.WALLET_TOPUP_MIN_AMOUNT - 1, method: 'BANKILY' });
    expect(res.status).toBe(422);
  });

  it('rejects a driver trying to top up (client-only feature)', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(driver.accessToken))
      .send({ amount: 500, method: 'BANKILY' });
    expect(res.status).toBe(403);
  });

  it('creates a mobile-money top-up already marked as declared, pending admin confirmation', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app)
      .post('/api/users/me/wallet/topups')
      .set(authHeader(client.accessToken))
      .send({ amount: 500, method: 'SEDAD' });

    expect(res.status).toBe(200);
    expect(res.body.data.topUp.status).toBe('PENDING');
    expect(res.body.data.topUp.method).toBe('SEDAD');
    expect(res.body.data.topUp.clientDeclaredAt).not.toBeNull();
    expect(res.body.data.url).toBeUndefined();

    const listRes = await request(app).get('/api/users/me/wallet/topups').set(authHeader(client.accessToken));
    expect(listRes.body.data.map((t) => t.id)).toContain(res.body.data.topUp.id);
  });

  describe('with Stripe configured', () => {
    let originalKey;
    beforeAll(() => {
      originalKey = env.STRIPE_SECRET_KEY;
      env.STRIPE_SECRET_KEY = 'sk_test_fake';
    });
    afterAll(() => {
      env.STRIPE_SECRET_KEY = originalKey;
    });

    it('creates a Stripe Checkout session for a CARD top-up', async () => {
      mockSessionsCreate.mockResolvedValue({ id: 'cs_test_topup_1', url: 'https://checkout.stripe.com/pay/cs_test_topup_1' });
      const client = await registerUser({ role: 'CLIENT' });

      const res = await request(app)
        .post('/api/users/me/wallet/topups')
        .set(authHeader(client.accessToken))
        .send({ amount: 500, method: 'CARD', successUrl: 'https://example.com/s', cancelUrl: 'https://example.com/c' });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toBe('https://checkout.stripe.com/pay/cs_test_topup_1');
      expect(res.body.data.topUp.stripeCheckoutSessionId).toBe('cs_test_topup_1');
      expect(mockSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { topUpId: res.body.data.topUp.id } })
      );
    });

    it('rejects a CARD top-up missing redirect URLs', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await request(app)
        .post('/api/users/me/wallet/topups')
        .set(authHeader(client.accessToken))
        .send({ amount: 500, method: 'CARD' });
      expect(res.status).toBe(422);
    });
  });
});
