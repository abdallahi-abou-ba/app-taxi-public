const request = require('supertest');
const { app, registerUser, authHeader } = require('./helpers');

const PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc000000301010018dd8db00000000049454e44ae426082',
  'hex'
);

function attachPng(req, field = 'file') {
  return req.attach(field, PNG_BUFFER, { filename: 'doc.png', contentType: 'image/png' });
}

describe('driver document upload + admin review', () => {
  describe('driver upload', () => {
    it('uploads each document type and lists their status', async () => {
      const driver = await registerUser({ role: 'DRIVER' });

      for (const type of ['PHOTO', 'ID_CARD', 'LICENSE']) {
        const res = await attachPng(
          request(app).post(`/api/users/me/documents/${type}`).set(authHeader(driver.accessToken))
        );
        expect(res.status).toBe(200);
        expect(res.body.data).toMatchObject({ type, mimeType: 'image/png' });
        expect(res.body.data.uploadedAt).toBeDefined();
      }

      const list = await request(app).get('/api/users/me/documents').set(authHeader(driver.accessToken));
      expect(list.status).toBe(200);
      expect(list.body.data).toHaveLength(3);
      expect(list.body.data.map((d) => d.type).sort()).toEqual(['ID_CARD', 'LICENSE', 'PHOTO']);
    });

    it('re-uploading the same type replaces it (upsert), not duplicates', async () => {
      const driver = await registerUser({ role: 'DRIVER' });

      await attachPng(request(app).post('/api/users/me/documents/PHOTO').set(authHeader(driver.accessToken)));
      const second = await attachPng(
        request(app).post('/api/users/me/documents/PHOTO').set(authHeader(driver.accessToken))
      );
      expect(second.status).toBe(200);

      const list = await request(app).get('/api/users/me/documents').set(authHeader(driver.accessToken));
      expect(list.body.data.filter((d) => d.type === 'PHOTO')).toHaveLength(1);
    });

    it('rejects a non-driver caller', async () => {
      const client = await registerUser({ role: 'CLIENT' });
      const res = await attachPng(
        request(app).post('/api/users/me/documents/PHOTO').set(authHeader(client.accessToken))
      );
      expect(res.status).toBe(403);
    });

    it('rejects a disallowed file type', async () => {
      const driver = await registerUser({ role: 'DRIVER' });
      const res = await request(app)
        .post('/api/users/me/documents/PHOTO')
        .set(authHeader(driver.accessToken))
        .attach('file', Buffer.from('not an image'), { filename: 'doc.txt', contentType: 'text/plain' });
      expect(res.status).toBe(400);
    });

    it('rejects an unknown document type param', async () => {
      const driver = await registerUser({ role: 'DRIVER' });
      const res = await attachPng(
        request(app).post('/api/users/me/documents/NOT_A_TYPE').set(authHeader(driver.accessToken))
      );
      expect(res.status).toBe(400);
    });

    it('rejects a request with no file attached', async () => {
      const driver = await registerUser({ role: 'DRIVER' });
      const res = await request(app).post('/api/users/me/documents/PHOTO').set(authHeader(driver.accessToken));
      expect(res.status).toBe(400);
    });
  });

  describe('admin review', () => {
    it("includes document status (but never raw bytes) in the driver detail response, and serves the exact file back", async () => {
      const admin = await require('./helpers').createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      await attachPng(request(app).post('/api/users/me/documents/PHOTO').set(authHeader(driver.accessToken)));

      const detail = await request(app)
        .get(`/api/admin/drivers/${driver.user.id}`)
        .set(authHeader(admin.accessToken));
      expect(detail.status).toBe(200);
      expect(detail.body.data.documents).toEqual([
        expect.objectContaining({ type: 'PHOTO', mimeType: 'image/png' }),
      ]);
      expect(detail.body.data.documents[0].data).toBeUndefined();
      expect(detail.body.data.photoUrl).toBeUndefined();

      const file = await request(app)
        .get(`/api/admin/drivers/${driver.user.id}/documents/PHOTO/file`)
        .set(authHeader(admin.accessToken))
        .buffer()
        .parse((res, cb) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toContain('image/png');
      expect(Buffer.compare(file.body, PNG_BUFFER)).toBe(0);
    });

    it('404s for a document type that was never uploaded', async () => {
      const admin = await require('./helpers').createAdmin();
      const driver = await registerUser({ role: 'DRIVER' });

      const res = await request(app)
        .get(`/api/admin/drivers/${driver.user.id}/documents/LICENSE/file`)
        .set(authHeader(admin.accessToken));
      expect(res.status).toBe(404);
    });

    it('rejects a non-admin caller', async () => {
      const driver = await registerUser({ role: 'DRIVER' });
      await attachPng(request(app).post('/api/users/me/documents/PHOTO').set(authHeader(driver.accessToken)));

      const res = await request(app)
        .get(`/api/admin/drivers/${driver.user.id}/documents/PHOTO/file`)
        .set(authHeader(driver.accessToken));
      expect(res.status).toBe(403);
    });
  });
});
