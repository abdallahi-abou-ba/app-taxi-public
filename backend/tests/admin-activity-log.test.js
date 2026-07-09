const request = require('supertest');
const { app, createAdmin, authHeader } = require('./helpers');

function driverPayload() {
  return { email: `driver-${Date.now()}-${Math.random()}@test.local`, password: 'password123', fullName: 'Log Test Driver', vehiclePlate: 'LOG-0001' };
}

describe('admin activity log', () => {
  it('records a DRIVER_CREATED entry when an admin creates a driver, visible only to SUPER_ADMIN', async () => {
    const superAdmin = await createAdmin();

    const created = await request(app)
      .post('/api/admin/drivers')
      .set(authHeader(superAdmin.accessToken))
      .send(driverPayload());
    expect(created.status).toBe(201);

    const log = await request(app).get('/api/admin/activity-log').set(authHeader(superAdmin.accessToken));
    expect(log.status).toBe(200);
    const entry = log.body.data.find((e) => e.entityId === created.body.data.id);
    expect(entry).toBeTruthy();
    expect(entry.action).toBe('DRIVER_CREATED');
    expect(entry.adminUser.id).toBe(superAdmin.user.id);

    const ops = await createAdmin({ adminRole: 'OPERATIONS' });
    const denied = await request(app).get('/api/admin/activity-log').set(authHeader(ops.accessToken));
    expect(denied.status).toBe(403);
  });

  it('filters by entityType and entityId', async () => {
    const superAdmin = await createAdmin();

    const created = await request(app)
      .post('/api/admin/drivers')
      .set(authHeader(superAdmin.accessToken))
      .send(driverPayload());

    await request(app)
      .patch(`/api/admin/drivers/${created.body.data.id}/status`)
      .set(authHeader(superAdmin.accessToken))
      .send({ status: 'SUSPENDED' });

    const filtered = await request(app)
      .get('/api/admin/activity-log')
      .query({ entityType: 'DRIVER', entityId: created.body.data.id })
      .set(authHeader(superAdmin.accessToken));

    expect(filtered.status).toBe(200);
    expect(filtered.body.data.length).toBeGreaterThanOrEqual(2);
    expect(filtered.body.data.every((e) => e.entityId === created.body.data.id)).toBe(true);
  });
});
