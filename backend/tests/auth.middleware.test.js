process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const express = require('express');
const request = require('supertest');
const { signToken } = require('../src/utils/jwt');
const { requireAuth, requireRole } = require('../src/middlewares/auth');
const { errorHandler } = require('../src/middlewares/errorHandler');

function buildTestApp() {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => res.json({ ok: true, user: req.user }));
  app.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('requireAuth', () => {
  const app = buildTestApp();

  test('rechaza una request sin token con 401', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('rechaza un token inválido con 401', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });

  test('acepta un token válido y expone req.user', async () => {
    const token = signToken({ sub: 'user123', role: 'operator' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 'user123', role: 'operator' });
  });
});

describe('requireRole', () => {
  const app = buildTestApp();

  test('operador no puede acceder a una ruta solo-admin (403), aunque consuma el endpoint directamente', async () => {
    const token = signToken({ sub: 'user123', role: 'operator' });
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('admin sí puede acceder a una ruta solo-admin', async () => {
    const token = signToken({ sub: 'admin1', role: 'admin' });
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
