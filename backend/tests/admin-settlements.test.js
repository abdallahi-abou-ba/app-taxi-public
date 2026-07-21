jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, createAdmin, authHeader } = require('./helpers');

const RIDE_PAYLOAD = { pickupLat: 33.5731, pickupLng: -7.5898, destinationLat: 33.5931, destinationLng: -7.6098 };

async function completeRide(client, driver, paymentMethod = 'CASH') {
  const created = await request(app)
    .post('/api/rides')
    .set(authHeader(client.accessToken))
    .send({ ...RIDE_PAYLOAD, paymentMethod });
  const rideId = created.body.data.id;
  await request(app).patch(`/api/rides/${rideId}/accept`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/arrive`).set(authHeader(driver.accessToken));
  await request(app).patch(`/api/rides/${rideId}/start`).set(authHeader(driver.accessToken));
  const completed = await request(app).patch(`/api/rides/${rideId}/complete`).set(authHeader(driver.accessToken));
  return completed.body.data;
}

describe('admin driver settlements', () => {
  it('rejects a non-admin caller', async () => {
    const client = await registerUser({ role: 'CLIENT' });
    const res = await request(app).get('/api/admin/settlements').set(authHeader(client.accessToken));
    expect(res.status).toBe(403);
  });

  it('generates a settlement netting cash commission owed against card net owed, then pays it', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const cashRide = await completeRide(client, driver, 'CASH');
    const cardRide = await completeRide(client, driver, 'CARD');

    const generated = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({
        driverId: driver.user.id,
        periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        periodEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    expect(generated.status).toBe(201);
    expect(generated.body.data.status).toBe('PENDING');
    expect(generated.body.data.cashCommissionOwed).toBeCloseTo(cashRide.commissionAmount, 2);
    expect(generated.body.data.cardNetOwed).toBeCloseTo(cardRide.driverNetAmount, 2);
    expect(generated.body.data.expensesOwed).toBe(0);
    expect(generated.body.data.netAmount).toBeCloseTo(cardRide.driverNetAmount - cashRide.commissionAmount, 2);

    const settlementId = generated.body.data.id;

    const list = await request(app).get('/api/admin/settlements').set(authHeader(admin.accessToken));
    expect(list.body.data.map((s) => s.id)).toContain(settlementId);

    const paid = await request(app).patch(`/api/admin/settlements/${settlementId}/pay`).set(authHeader(admin.accessToken));
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('PAID');
    expect(paid.body.data.paidByUser.id).toBe(admin.user.id);

    const rePay = await request(app).patch(`/api/admin/settlements/${settlementId}/pay`).set(authHeader(admin.accessToken));
    expect(rePay.status).toBe(409);
  });

  it('subtracts driver-borne expenses from the net amount owed', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const cardRide = await completeRide(client, driver, 'CARD');

    const expense = await request(app)
      .post('/api/admin/expenses')
      .set(authHeader(admin.accessToken))
      .send({ category: 'UNIFORM', amount: 20, driverId: driver.user.id, bearer: 'DRIVER' });
    expect(expense.status).toBe(201);

    const generated = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({
        driverId: driver.user.id,
        periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        periodEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    expect(generated.status).toBe(201);
    expect(generated.body.data.expensesOwed).toBeCloseTo(20, 2);
    expect(generated.body.data.netAmount).toBeCloseTo(cardRide.driverNetAmount - 20, 2);
  });

  it('treats a Bankily/mobile-money ride like cash, not like card', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const driver = await registerUser({ role: 'DRIVER' });

    const bankilyRide = await completeRide(client, driver, 'BANKILY');

    const generated = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({
        driverId: driver.user.id,
        periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        periodEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
    expect(generated.status).toBe(201);
    // The driver received the transfer directly (like cash), so the company
    // is owed commission on it, not the other way around.
    expect(generated.body.data.cashCommissionOwed).toBeCloseTo(bankilyRide.commissionAmount, 2);
    expect(generated.body.data.cardNetOwed).toBe(0);
  });

  it('rejects a period where periodEnd is not after periodStart', async () => {
    const admin = await createAdmin();
    const driver = await registerUser({ role: 'DRIVER' });

    const res = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({ driverId: driver.user.id, periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() - 1000).toISOString() });
    expect(res.status).toBe(422);
  });

  it('auto-pays from the driver\'s recharged balance (creditBalance) before falling back to manual declare/confirm', async () => {
    const admin = await createAdmin();
    const client = await registerUser({ role: 'CLIENT' });
    const fullyCoveredDriver = await registerUser({ role: 'DRIVER' });
    const partiallyCoveredDriver = await registerUser({ role: 'DRIVER' });

    const fullyCoveredRide = await completeRide(client, fullyCoveredDriver, 'CASH');
    const partiallyCoveredRide = await completeRide(client, partiallyCoveredDriver, 'CASH');

    // More balance than owed - the whole settlement should be auto-paid.
    await prisma.user.update({
      where: { id: fullyCoveredDriver.user.id },
      data: { creditBalance: fullyCoveredRide.commissionAmount + 1000 },
    });
    // Less balance than owed - only part of it should be auto-applied.
    const partialCredit = Math.max(0, partiallyCoveredRide.commissionAmount - 1);
    await prisma.user.update({ where: { id: partiallyCoveredDriver.user.id }, data: { creditBalance: partialCredit } });

    const period = {
      periodStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      periodEnd: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };

    const fullyCoveredSettlement = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({ driverId: fullyCoveredDriver.user.id, ...period });
    expect(fullyCoveredSettlement.body.data.creditApplied).toBeCloseTo(fullyCoveredRide.commissionAmount, 2);
    expect(fullyCoveredSettlement.body.data.status).toBe('PAID');

    const fullyCoveredDriverAfter = await prisma.user.findUnique({ where: { id: fullyCoveredDriver.user.id } });
    expect(fullyCoveredDriverAfter.creditBalance).toBeCloseTo(1000, 2);

    const partiallyCoveredSettlement = await request(app)
      .post('/api/admin/settlements')
      .set(authHeader(admin.accessToken))
      .send({ driverId: partiallyCoveredDriver.user.id, ...period });
    expect(partiallyCoveredSettlement.body.data.creditApplied).toBeCloseTo(partialCredit, 2);
    expect(partiallyCoveredSettlement.body.data.status).toBe('PENDING');

    const partiallyCoveredDriverAfter = await prisma.user.findUnique({ where: { id: partiallyCoveredDriver.user.id } });
    expect(partiallyCoveredDriverAfter.creditBalance).toBeCloseTo(0, 2);
  });
});
