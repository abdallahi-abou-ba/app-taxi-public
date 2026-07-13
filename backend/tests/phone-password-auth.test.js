const request = require('supertest');
const { app, uniquePhone } = require('./helpers');

describe('phone+password auth', () => {
  it('registers and logs back in with phone + password', async () => {
    const phone = uniquePhone();
    const registerRes = await request(app).post('/api/auth/register-phone').send({
      phone,
      password: 'password123',
      nom: 'Dupont',
      prenom: 'Jeanne',
      role: 'CLIENT',
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.phone).toBe(`+222${phone}`);
    expect(registerRes.body.data.user.fullName).toBe('Jeanne Dupont');
    expect(registerRes.body.data.user.email).toBeNull();
    expect(registerRes.body.data.accessToken).toBeTruthy();

    const loginRes = await request(app).post('/api/auth/login-phone').send({ phone, password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.phone).toBe(`+222${phone}`);
  });

  it('rejects registering the same phone number twice', async () => {
    const phone = uniquePhone();
    await request(app)
      .post('/api/auth/register-phone')
      .send({ phone, password: 'password123', nom: 'A', prenom: 'B', role: 'CLIENT' });

    const res = await request(app)
      .post('/api/auth/register-phone')
      .send({ phone, password: 'password123', nom: 'C', prenom: 'D', role: 'CLIENT' });
    expect(res.status).toBe(409);
  });

  it('rejects an incorrect password', async () => {
    const phone = uniquePhone();
    await request(app)
      .post('/api/auth/register-phone')
      .send({ phone, password: 'password123', nom: 'A', prenom: 'B', role: 'CLIENT' });

    const res = await request(app).post('/api/auth/login-phone').send({ phone, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects a phone number with no account', async () => {
    const res = await request(app).post('/api/auth/login-phone').send({ phone: uniquePhone(), password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('requires a vehicle plate for a DRIVER registration', async () => {
    const res = await request(app)
      .post('/api/auth/register-phone')
      .send({ phone: uniquePhone(), password: 'password123', nom: 'A', prenom: 'B', role: 'DRIVER' });
    expect(res.status).toBe(400);
  });

  it('registers a DRIVER with vehicle info', async () => {
    const res = await request(app).post('/api/auth/register-phone').send({
      phone: uniquePhone(),
      password: 'password123',
      nom: 'Sow',
      prenom: 'Ahmed',
      role: 'DRIVER',
      vehiclePlate: '1234-AB-01',
      vehicleModel: 'Toyota Corolla',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.vehiclePlate).toBe('1234-AB-01');
    expect(res.body.data.user.approvalStatus).toBe('PENDING');
  });
});
