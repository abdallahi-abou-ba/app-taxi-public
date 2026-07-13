const request = require('supertest');
const { app, uniquePhone, registerUserByPhone } = require('./helpers');

describe('phone+OTP auth', () => {
  it('registers a new phone number end-to-end (request-otp -> verify-otp -> complete-registration)', async () => {
    const phone = uniquePhone();

    const otpRes = await request(app).post('/api/auth/request-otp').send({ phone });
    expect(otpRes.status).toBe(200);
    expect(otpRes.body.data.devCode).toMatch(/^\d{6}$/);

    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ phone, code: otpRes.body.data.devCode });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.isNewUser).toBe(true);
    expect(verifyRes.body.data.registrationToken).toBeTruthy();

    const completeRes = await request(app).post('/api/auth/complete-registration').send({
      registrationToken: verifyRes.body.data.registrationToken,
      fullName: 'New Phone User',
      role: 'CLIENT',
    });
    expect(completeRes.status).toBe(201);
    expect(completeRes.body.data.user.phone).toBe(`+222${phone}`);
    expect(completeRes.body.data.user.email).toBeNull();
    expect(completeRes.body.data.accessToken).toBeTruthy();
  });

  it('lets an existing phone number log straight back in (isNewUser: false)', async () => {
    const { phone } = await registerUserByPhone();

    const otpRes = await request(app).post('/api/auth/request-otp').send({ phone });
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ phone, code: otpRes.body.data.devCode });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.isNewUser).toBe(false);
    expect(verifyRes.body.data.accessToken).toBeTruthy();
  });

  it('rejects an incorrect code', async () => {
    const phone = uniquePhone();
    await request(app).post('/api/auth/request-otp').send({ phone });

    const res = await request(app).post('/api/auth/verify-otp').send({ phone, code: '000000' });
    expect(res.status).toBe(401);
  });

  it('rejects a code for a phone that never requested one', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({ phone: uniquePhone(), code: '123456' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid phone number format', async () => {
    const res = await request(app).post('/api/auth/request-otp').send({ phone: '123' });
    expect(res.status).toBe(400);
  });

  it('rejects reusing an already-consumed code', async () => {
    const phone = uniquePhone();
    const otpRes = await request(app).post('/api/auth/request-otp').send({ phone });
    await request(app).post('/api/auth/verify-otp').send({ phone, code: otpRes.body.data.devCode });

    const reuse = await request(app).post('/api/auth/verify-otp').send({ phone, code: otpRes.body.data.devCode });
    expect(reuse.status).toBe(401);
  });

  it('rejects completing registration with an invalid registration token', async () => {
    const res = await request(app)
      .post('/api/auth/complete-registration')
      .send({ registrationToken: 'not-a-real-token', fullName: 'Someone', role: 'CLIENT' });
    expect(res.status).toBe(401);
  });

});
