jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };
const REWARD_AMOUNT = 20;

async function completeARide(clientToken, driverToken) {
  const created = await request(app).post('/api/rides').set(authHeader(clientToken)).send(RIDE_PAYLOAD);
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driverToken));
  await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driverToken));
  await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driverToken));
  const completed = await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driverToken));
  return completed.body.data;
}

describe('registration + referral code', () => {
  it('assigns each new user a referral code', async () => {
    const user = await registerUser({ role: 'CLIENT' });
    expect(user.user.referralCode).toEqual(expect.any(String));
    expect(user.user.referralCode.length).toBeGreaterThan(0);
  });

  it('accepts a valid referral code and links the accounts', async () => {
    const referrer = await registerUser({ role: 'CLIENT' });
    const referred = await registerUser({ role: 'CLIENT', referralCode: referrer.user.referralCode });
    expect(referred.user.referredById).toBe(referrer.user.id);
  });

  it('rejects an unknown referral code', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'bad-referral@test.local',
      password: 'password123',
      fullName: 'Bad Referral',
      role: 'CLIENT',
      referralCode: 'NOTAREALCODE',
    });
    expect(res.status).toBe(422);
  });
});

describe('referral reward on first completed ride', () => {
  it('grants credit to both sides once, applies existing credit to a later ride, and never rewards twice', async () => {
    const referrer = await registerUser({ role: 'CLIENT' });
    const referred = await registerUser({ role: 'CLIENT', referralCode: referrer.user.referralCode });
    const driver = await registerUser({ role: 'DRIVER' });

    const firstRide = await completeARide(referred.accessToken, driver.accessToken);
    expect(firstRide.creditApplied).toBe(0);

    const referredAfterFirst = await request(app).get('/api/users/me').set(authHeader(referred.accessToken));
    const referrerAfterFirst = await request(app).get('/api/users/me').set(authHeader(referrer.accessToken));
    expect(referredAfterFirst.body.data.creditBalance).toBe(REWARD_AMOUNT);
    expect(referrerAfterFirst.body.data.creditBalance).toBe(REWARD_AMOUNT);
    expect(referredAfterFirst.body.data.referralRewardGrantedAt).not.toBeNull();

    const secondRide = await completeARide(referred.accessToken, driver.accessToken);
    expect(secondRide.creditApplied).toBeGreaterThan(0);
    expect(secondRide.creditApplied).toBeLessThanOrEqual(REWARD_AMOUNT);

    const referredAfterSecond = await request(app).get('/api/users/me').set(authHeader(referred.accessToken));
    const referrerAfterSecond = await request(app).get('/api/users/me').set(authHeader(referrer.accessToken));
    expect(referredAfterSecond.body.data.creditBalance).toBeCloseTo(REWARD_AMOUNT - secondRide.creditApplied);
    // Referrer's balance is untouched by the referred client's second ride - confirms no double reward.
    expect(referrerAfterSecond.body.data.creditBalance).toBe(REWARD_AMOUNT);
  });

  it('does not grant a reward when the client was not referred', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    await completeARide(client.accessToken, driver.accessToken);

    const after = await request(app).get('/api/users/me').set(authHeader(client.accessToken));
    expect(after.body.data.creditBalance).toBe(0);
    expect(after.body.data.referralRewardGrantedAt).toBeNull();
  });
});

describe('GET /api/users/me/referrals', () => {
  it('returns the referral code, credit balance, and referral count', async () => {
    const referrer = await registerUser({ role: 'CLIENT' });
    await registerUser({ role: 'CLIENT', referralCode: referrer.user.referralCode });
    await registerUser({ role: 'CLIENT', referralCode: referrer.user.referralCode });

    const res = await request(app).get('/api/users/me/referrals').set(authHeader(referrer.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.referralCode).toBe(referrer.user.referralCode);
    expect(res.body.data.referralCount).toBe(2);
    expect(res.body.data.creditBalance).toBe(0);
  });
});
