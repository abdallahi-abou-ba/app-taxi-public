jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

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
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

async function createMobileMoneyTopUp(client, amount = 500) {
  const res = await request(app)
    .post('/api/users/me/wallet/topups')
    .set(authHeader(client.accessToken))
    .send({ amount, method: 'BANKILY' });
  return res.body.data.topUp;
}

describe('admin wallet top-up review', () => {
  it('lists pending top-ups and confirms a mobile-money one, crediting the balance', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const topUp = await createMobileMoneyTopUp(client, 500);

    const listRes = await request(app)
      .get('/api/admin/wallet-topups?status=PENDING')
      .set(authHeader(admin.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.map((t) => t.id)).toContain(topUp.id);

    const confirmRes = await request(app)
      .patch(`/api/admin/wallet-topups/${topUp.id}/confirm`)
      .set(authHeader(admin.accessToken));
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');
    expect(confirmRes.body.data.confirmedByUser.id).toBe(admin.user.id);

    const me = await request(app).get('/api/users/me').set(authHeader(client.accessToken));
    expect(me.body.data.creditBalance).toBe(500);
  });

  it('rejects confirming the same top-up twice', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const topUp = await createMobileMoneyTopUp(client);

    await request(app).patch(`/api/admin/wallet-topups/${topUp.id}/confirm`).set(authHeader(admin.accessToken));
    const res = await request(app).patch(`/api/admin/wallet-topups/${topUp.id}/confirm`).set(authHeader(admin.accessToken));
    expect(res.status).toBe(409);
  });

  it('cancels a pending top-up without touching the balance', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const topUp = await createMobileMoneyTopUp(client);

    const cancelRes = await request(app)
      .patch(`/api/admin/wallet-topups/${topUp.id}/cancel`)
      .set(authHeader(admin.accessToken));
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    const me = await request(app).get('/api/users/me').set(authHeader(client.accessToken));
    expect(me.body.data.creditBalance).toBe(0);
  });

  it('rejects a non-FINANCE admin confirming a top-up', async () => {
    const supportAdmin = await createAdmin({ adminRole: 'SUPPORT' });
    const client = await registerUser({ role: 'CLIENT' });
    const topUp = await createMobileMoneyTopUp(client);

    const res = await request(app)
      .patch(`/api/admin/wallet-topups/${topUp.id}/confirm`)
      .set(authHeader(supportAdmin.accessToken));
    expect(res.status).toBe(403);
  });

  describe('CARD top-ups (Stripe)', () => {
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
    beforeEach(() => {
      mockSessionsCreate.mockReset();
      mockConstructEvent.mockReset();
    });

    it('rejects an admin manually confirming a CARD top-up', async () => {
      mockSessionsCreate.mockResolvedValue({ id: 'cs_test_admin_1', url: 'https://checkout.stripe.com/pay/cs_test_admin_1' });
      const admin = await createAdmin();
      const client = await registerUser({ role: 'CLIENT' });
      const created = await request(app)
        .post('/api/users/me/wallet/topups')
        .set(authHeader(client.accessToken))
        .send({ amount: 500, method: 'CARD', successUrl: 'https://example.com/s', cancelUrl: 'https://example.com/c' });

      const res = await request(app)
        .patch(`/api/admin/wallet-topups/${created.body.data.topUp.id}/confirm`)
        .set(authHeader(admin.accessToken));
      expect(res.status).toBe(409);
    });

    it('credits the balance via the Stripe webhook, idempotently', async () => {
      mockSessionsCreate.mockResolvedValue({ id: 'cs_test_admin_2', url: 'https://checkout.stripe.com/pay/cs_test_admin_2' });
      const client = await registerUser({ role: 'CLIENT' });
      const created = await request(app)
        .post('/api/users/me/wallet/topups')
        .set(authHeader(client.accessToken))
        .send({ amount: 700, method: 'CARD', successUrl: 'https://example.com/s', cancelUrl: 'https://example.com/c' });
      const topUpId = created.body.data.topUp.id;

      mockConstructEvent.mockReturnValue({
        type: 'checkout.session.completed',
        data: { object: { metadata: { topUpId }, payment_intent: 'pi_topup_1' } },
      });
      await request(app).post('/api/webhooks/stripe').set('stripe-signature', 't').send(Buffer.from('{}'));
      await request(app).post('/api/webhooks/stripe').set('stripe-signature', 't').send(Buffer.from('{}'));

      const me = await request(app).get('/api/users/me').set(authHeader(client.accessToken));
      expect(me.body.data.creditBalance).toBe(700);
    });
  });
});
