const request = require('supertest');
const { app, registerUser, createAdmin, authHeader } = require('./helpers');

const VEHICLE_PAYLOAD = { brand: 'Toyota', model: 'Corolla', plate: 'AB-1234', color: 'white', year: 2020, seatCount: 4 };

describe('admin vehicle management', () => {
  it('rejects a non-admin caller', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/vehicles').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('creates, lists, and fetches a vehicle', async () => {
    const admin = await createAdmin();

    const created = await request(app).post('/api/admin/vehicles').set(authHeader(admin.accessToken)).send(VEHICLE_PAYLOAD);
    expect(created.status).toBe(201);
    expect(created.body.data.plate).toBe('AB-1234');
    expect(created.body.data.status).toBe('ACTIVE');

    const list = await request(app).get('/api/admin/vehicles').set(authHeader(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data.map((v) => v.id)).toContain(created.body.data.id);

    const detail = await request(app)
      .get(`/api/admin/vehicles/${created.body.data.id}`)
      .set(authHeader(admin.accessToken));
    expect(detail.status).toBe(200);
    expect(detail.body.data.assignments).toEqual([]);
  });

  it('rejects a duplicate plate', async () => {
    const admin = await createAdmin();
    await request(app).post('/api/admin/vehicles').set(authHeader(admin.accessToken)).send(VEHICLE_PAYLOAD);

    const dup = await request(app)
      .post('/api/admin/vehicles')
      .set(authHeader(admin.accessToken))
      .send({ ...VEHICLE_PAYLOAD, brand: 'Hyundai' });
    expect(dup.status).toBe(409);
  });

  it('assigns, reassigns, and unassigns a vehicle, keeping an accurate history', async () => {
    const admin = await createAdmin();
    const driverA = await registerUser({ role: 'DRIVER' });
    const driverB = await registerUser({ role: 'DRIVER' });

    const vehicle = await request(app).post('/api/admin/vehicles').set(authHeader(admin.accessToken)).send(VEHICLE_PAYLOAD);
    const vehicleId = vehicle.body.data.id;

    const assignedA = await request(app)
      .patch(`/api/admin/vehicles/${vehicleId}/assign`)
      .set(authHeader(admin.accessToken))
      .send({ driverId: driverA.user.id });
    expect(assignedA.status).toBe(200);
    expect(assignedA.body.data.currentDriverId).toBe(driverA.user.id);
    expect(assignedA.body.data.assignments).toHaveLength(1);
    expect(assignedA.body.data.assignments[0].endDate).toBeNull();

    const assignedB = await request(app)
      .patch(`/api/admin/vehicles/${vehicleId}/assign`)
      .set(authHeader(admin.accessToken))
      .send({ driverId: driverB.user.id });
    expect(assignedB.status).toBe(200);
    expect(assignedB.body.data.currentDriverId).toBe(driverB.user.id);
    expect(assignedB.body.data.assignments).toHaveLength(2);
    const closedForA = assignedB.body.data.assignments.find((a) => a.driverId === driverA.user.id);
    expect(closedForA.endDate).not.toBeNull();
    const openForB = assignedB.body.data.assignments.find((a) => a.driverId === driverB.user.id);
    expect(openForB.endDate).toBeNull();

    const unassigned = await request(app)
      .patch(`/api/admin/vehicles/${vehicleId}/unassign`)
      .set(authHeader(admin.accessToken));
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.data.currentDriverId).toBeNull();
  });

  it('archives a vehicle, closing its assignment and clearing the current driver', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });

    const vehicle = await request(app).post('/api/admin/vehicles').set(authHeader(admin.accessToken)).send(VEHICLE_PAYLOAD);
    const vehicleId = vehicle.body.data.id;
    await request(app)
      .patch(`/api/admin/vehicles/${vehicleId}/assign`)
      .set(authHeader(admin.accessToken))
      .send({ driverId: driver.user.id });

    const archived = await request(app).delete(`/api/admin/vehicles/${vehicleId}`).set(authHeader(admin.accessToken));
    expect(archived.status).toBe(200);

    const detail = await request(app).get(`/api/admin/vehicles/${vehicleId}`).set(authHeader(admin.accessToken));
    expect(detail.body.data.status).toBe('ARCHIVED');
    expect(detail.body.data.currentDriverId).toBeNull();
    expect(detail.body.data.assignments[0].endDate).not.toBeNull();
  });
});
