const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

describe('admin expense management', () => {
  it('rejects a non-admin caller', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/expenses').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('creates, lists, fetches, updates, and deletes an expense', async () => {
    const admin = await createAdmin();

    const created = await request(app)
      .post('/api/admin/expenses')
      .set(authHeader(admin.accessToken))
      .send({ category: 'FUEL', amount: 42.5, description: 'Essence' });
    expect(created.status).toBe(201);
    expect(created.body.data.category).toBe('FUEL');
    expect(created.body.data.createdByUser.id).toBe(admin.user.id);

    const list = await request(app).get('/api/admin/expenses').set(authHeader(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.map((e) => e.id)).toContain(created.body.data.id);
    expect(list.body.meta.totalAmount).toBeGreaterThanOrEqual(42.5);

    const detail = await request(app).get(`/api/admin/expenses/${created.body.data.id}`).set(authHeader(admin.accessToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.amount).toBe(42.5);

    const updated = await request(app)
      .patch(`/api/admin/expenses/${created.body.data.id}`)
      .set(authHeader(admin.accessToken))
      .send({ amount: 55 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.amount).toBe(55);

    const deleted = await request(app).delete(`/api/admin/expenses/${created.body.data.id}`).set(authHeader(admin.accessToken));
    expect(deleted.status).toBe(200);

    const afterDelete = await request(app).get(`/api/admin/expenses/${created.body.data.id}`).set(authHeader(admin.accessToken));
    expect(afterDelete.status).toBe(404);
  });

  it('summarizes expenses by category', async () => {
    const admin = await createAdmin();

    await request(app).post('/api/admin/expenses').set(authHeader(admin.accessToken)).send({ category: 'FUEL', amount: 10 });
    await request(app).post('/api/admin/expenses').set(authHeader(admin.accessToken)).send({ category: 'FUEL', amount: 15 });
    await request(app)
      .post('/api/admin/expenses')
      .set(authHeader(admin.accessToken))
      .send({ category: 'MAINTENANCE', amount: 100 });

    const summary = await request(app).get('/api/admin/expenses/summary').set(authHeader(admin.accessToken));
    expect(summary.status).toBe(200);
    expect(summary.body.data.byCategory.FUEL).toBeGreaterThanOrEqual(25);
    expect(summary.body.data.byCategory.MAINTENANCE).toBeGreaterThanOrEqual(100);
  });
});
