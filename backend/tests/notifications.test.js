jest.mock('../src/utils/osrm.util', () => ({
  getRoute: jest.fn().mockResolvedValue(null),
}));
jest.mock('../src/utils/geocode.util', () => ({
  reverseGeocode: jest.fn().mockResolvedValue(null),
}));

const request = require('supertest');
const { app, prisma, registerUser, authHeader } = require('./helpers');

describe('in-app notifications', () => {
  it('lists a user\'s own notifications, newest first, with an unread count', async () => {
    const driver = await registerUser({ role: 'DRIVER' });

    await prisma.notification.create({
      data: { userId: driver.user.id, type: 'driver:approval', title: 'Compte validé', body: 'Bienvenue' },
    });
    const second = await prisma.notification.create({
      data: { userId: driver.user.id, type: 'wallet:confirmed', title: 'Recharge confirmée', body: '500 crédités' },
    });

    const res = await request(app).get('/api/users/me/notifications').set(authHeader(driver.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].id).toBe(second.id);
    expect(res.body.meta.unreadCount).toBe(2);
  });

  it('never returns another user\'s notifications', async () => {
    const driverA = await registerUser({ role: 'DRIVER' });
    const driverB = await registerUser({ role: 'DRIVER' });

    await prisma.notification.create({
      data: { userId: driverA.user.id, type: 'driver:approval', title: 'Compte validé', body: 'Bienvenue' },
    });

    const res = await request(app).get('/api/users/me/notifications').set(authHeader(driverB.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('marks every unread notification as read in one call', async () => {
    const driver = await registerUser({ role: 'DRIVER' });
    await prisma.notification.createMany({
      data: [
        { userId: driver.user.id, type: 'ride:status', title: 'Course terminée', body: 'Notez votre course' },
        { userId: driver.user.id, type: 'settlement:paid', title: 'Règlement payé', body: 'Confirmé' },
      ],
    });

    const markRead = await request(app).patch('/api/users/me/notifications/read-all').set(authHeader(driver.accessToken));
    expect(markRead.status).toBe(200);

    const res = await request(app).get('/api/users/me/notifications').set(authHeader(driver.accessToken));
    expect(res.body.meta.unreadCount).toBe(0);
    expect(res.body.data.every((n) => n.read)).toBe(true);
  });
});
