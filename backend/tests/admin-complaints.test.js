const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

describe('complaints', () => {
  it('lets any authenticated user submit a complaint', async () => {
    const client = await registerUser({ role: 'CLIENT' });

    const res = await request(app)
      .post('/api/complaints')
      .set(authHeader(client.accessToken))
      .send({ category: 'PAYMENT', description: 'Le chauffeur a demandé plus que le tarif affiché.' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.submittedByUser.id).toBe(client.user.id);
  });

  it('rejects an unauthenticated submission', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .send({ category: 'OTHER', description: 'test' });
    expect(res.status).toBe(401);
  });

  it('lets a SUPPORT admin list and resolve a complaint, but denies OPERATIONS', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const submitted = await request(app)
      .post('/api/complaints')
      .set(authHeader(client.accessToken))
      .send({ category: 'SAFETY', description: 'Conduite dangereuse.' });

    const support = await createAdmin({ adminRole: 'SUPPORT' });
    const list = await request(app).get('/api/admin/complaints').set(authHeader(support.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.map((c) => c.id)).toContain(submitted.body.data.id);

    const detail = await request(app)
      .get(`/api/admin/complaints/${submitted.body.data.id}`)
      .set(authHeader(support.accessToken));
    expect(detail.status).toBe(200);

    const updated = await request(app)
      .patch(`/api/admin/complaints/${submitted.body.data.id}`)
      .set(authHeader(support.accessToken))
      .send({ status: 'RESOLVED', adminNotes: 'Chauffeur averti.' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('RESOLVED');
    expect(updated.body.data.resolvedByUser.id).toBe(support.user.id);
    expect(updated.body.data.resolvedAt).not.toBeNull();

    const ops = await createAdmin({ adminRole: 'OPERATIONS' });
    const denied = await request(app).get('/api/admin/complaints').set(authHeader(ops.accessToken));
    expect(denied.status).toBe(403);
  });
});
