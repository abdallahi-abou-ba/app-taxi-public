const request = require('supertest');
const { app, uniquePhone, registerUser, authHeader } = require('./helpers');

describe('phone+OTP auth - registration edge cases and email bridging', () => {
  it('rejects completing registration with an invalid registration token', async () => {
    const res = await request(app)
      .post('/api/auth/complete-registration')
      .send({ registrationToken: 'not-a-real-token', fullName: 'Someone', role: 'CLIENT' });
    expect(res.status).toBe(401);
  });

  it('requires a vehicle plate for a DRIVER registration', async () => {
    const phone = uniquePhone();
    const otpRes = await request(app).post('/api/auth/request-otp').send({ phone });
    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ phone, code: otpRes.body.data.devCode });

    const res = await request(app)
      .post('/api/auth/complete-registration')
      .send({ registrationToken: verifyRes.body.data.registrationToken, fullName: 'No Plate Driver', role: 'DRIVER' });
    expect(res.status).toBe(400);
  });

  it('does not affect email+password login for an existing account', async () => {
    const { user } = await registerUser({ email: `still-works-${Date.now()}@test.local`, password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });
    expect(res.status).toBe(200);
  });

  describe('bridging an existing email account to phone login', () => {
    it('lets an authenticated user attach a phone, then log in with it', async () => {
      const email = `bridge-${Date.now()}@test.local`;
      const { accessToken } = await registerUser({ email, password: 'password123' });
      const phone = uniquePhone();

      const otpRes = await request(app)
        .post('/api/users/me/phone/request-otp')
        .set(authHeader(accessToken))
        .send({ phone });
      expect(otpRes.status).toBe(200);

      const verifyRes = await request(app)
        .post('/api/users/me/phone/verify-otp')
        .set(authHeader(accessToken))
        .send({ phone, code: otpRes.body.data.devCode });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.phone).toBe(`+222${phone}`);

      const loginOtp = await request(app).post('/api/auth/request-otp').send({ phone });
      const loginVerify = await request(app).post('/api/auth/verify-otp').send({ phone, code: loginOtp.body.data.devCode });
      expect(loginVerify.body.data.isNewUser).toBe(false);
      expect(loginVerify.body.data.user.email).toBe(email);
    });
  });
});
