const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

describe('admin roles and permissions', () => {
  it('rejects a non-admin caller from the admins subtree', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/admins').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('a FINANCE (Comptable) admin can reach revenue/expenses but not drivers', async () => {
    const finance = await createAdmin({ adminRole: 'FINANCE' });

    const revenue = await request(app).get('/api/admin/revenue').set(authHeader(finance.accessToken));
    expect(revenue.status).toBe(200);

    const expenses = await request(app).get('/api/admin/expenses').set(authHeader(finance.accessToken));
    expect(expenses.status).toBe(200);

    const drivers = await request(app).get('/api/admin/drivers').set(authHeader(finance.accessToken));
    expect(drivers.status).toBe(403);
  });

  it('an OPERATIONS (Administrateur) admin can reach drivers/vehicles/revenue but not expenses', async () => {
    const ops = await createAdmin({ adminRole: 'OPERATIONS' });

    const drivers = await request(app).get('/api/admin/drivers').set(authHeader(ops.accessToken));
    expect(drivers.status).toBe(200);

    const vehicles = await request(app).get('/api/admin/vehicles').set(authHeader(ops.accessToken));
    expect(vehicles.status).toBe(200);

    const revenue = await request(app).get('/api/admin/revenue').set(authHeader(ops.accessToken));
    expect(revenue.status).toBe(200);

    const expenses = await request(app).get('/api/admin/expenses').set(authHeader(ops.accessToken));
    expect(expenses.status).toBe(403);
  });

  it('a SUPPORT admin can reach complaints/clients but not drivers, and none of them can reach /admins', async () => {
    const support = await createAdmin({ adminRole: 'SUPPORT' });

    const complaints = await request(app).get('/api/admin/complaints').set(authHeader(support.accessToken));
    expect(complaints.status).toBe(200);

    const drivers = await request(app).get('/api/admin/drivers').set(authHeader(support.accessToken));
    expect(drivers.status).toBe(403);

    const admins = await request(app).get('/api/admin/admins').set(authHeader(support.accessToken));
    expect(admins.status).toBe(403);
  });

  it('lets a SUPER_ADMIN create another admin and change their role, but not their own', async () => {
    const superAdmin = await createAdmin();

    const created = await request(app)
      .post('/api/admin/admins')
      .set(authHeader(superAdmin.accessToken))
      .send({ email: `finance-${Date.now()}@test.local`, password: 'password123', fullName: 'Finance Admin', adminRole: 'FINANCE' });
    expect(created.status).toBe(201);
    expect(created.body.data.adminRole).toBe('FINANCE');

    const list = await request(app).get('/api/admin/admins').set(authHeader(superAdmin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.map((a) => a.id)).toContain(created.body.data.id);

    const changed = await request(app)
      .patch(`/api/admin/admins/${created.body.data.id}/role`)
      .set(authHeader(superAdmin.accessToken))
      .send({ adminRole: 'OPERATIONS' });
    expect(changed.status).toBe(200);
    expect(changed.body.data.adminRole).toBe('OPERATIONS');

    const selfChange = await request(app)
      .patch(`/api/admin/admins/${superAdmin.user.id}/role`)
      .set(authHeader(superAdmin.accessToken))
      .send({ adminRole: 'FINANCE' });
    expect(selfChange.status).toBe(409);
  });
});
