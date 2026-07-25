/**
 * Tests del módulo Spaces (Ticket 2).
 * Usan mongodb-memory-server con replica set habilitado para soportar
 * transacciones (aunque spaces no las usa, el setup es compartido).
 */

process.env.JWT_SECRET = 'test-secret';

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Space = require('../src/models/Space');
const { signToken } = require('../src/utils/jwt');
const bcrypt = require('bcrypt');

let replSet;
let app;
let adminToken;
let operatorToken;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
  app = createApp();

  const hash = await bcrypt.hash('pass123', 10);
  await User.create([
    { name: 'Admin', email: 'admin@test.com', passwordHash: hash, role: 'admin', active: true },
    { name: 'Op', email: 'op@test.com', passwordHash: hash, role: 'operator', active: true },
  ]);

  const admin = await User.findOne({ email: 'admin@test.com' });
  const op = await User.findOne({ email: 'op@test.com' });
  adminToken = signToken({ sub: admin._id.toString(), role: 'admin' });
  operatorToken = signToken({ sub: op._id.toString(), role: 'operator' });
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Space.deleteMany({});
});

// ---------------------------------------------------------------------------
describe('GET /api/spaces', () => {
  test('rechaza sin token con 401', async () => {
    const res = await request(app).get('/api/spaces');
    expect(res.status).toBe(401);
  });

  test('operator recibe solo espacios activos', async () => {
    await Space.create([
      { name: 'Activo', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00', active: true },
      { name: 'Inactivo', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00', active: false },
    ]);
    const res = await request(app)
      .get('/api/spaces')
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Activo');
  });

  test('admin recibe activos e inactivos', async () => {
    await Space.create([
      { name: 'Activo', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00', active: true },
      { name: 'Inactivo', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00', active: false },
    ]);
    const res = await request(app)
      .get('/api/spaces')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('POST /api/spaces', () => {
  const validSpace = {
    name: 'Sala Test',
    type: 'sala',
    location: 'Sede B',
    capacity: 8,
    openTime: '07:00',
    closeTime: '20:00',
  };

  test('operator no puede crear espacios (403)', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${operatorToken}`)
      .send(validSpace);
    expect(res.status).toBe(403);
  });

  test('admin crea un espacio con datos válidos (201)', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validSpace);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Sala Test');
    expect(res.body.data.active).toBe(true);
  });

  test('rechaza capacity < 1 con 400', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validSpace, capacity: 0 });
    expect(res.status).toBe(400);
  });

  test('rechaza openTime >= closeTime con 400', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validSpace, openTime: '18:00', closeTime: '08:00' });
    expect(res.status).toBe(400);
  });

  test('rechaza formato HH:mm inválido con 400', async () => {
    const res = await request(app)
      .post('/api/spaces')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...validSpace, openTime: '7:00' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/spaces/:id', () => {
  test('admin actualiza un espacio existente', async () => {
    const space = await Space.create({
      name: 'Original', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00',
    });
    const res = await request(app)
      .put(`/api/spaces/${space._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Actualizado', type: 'sala', location: 'Sede A', capacity: 10, openTime: '08:00', closeTime: '20:00' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Actualizado');
    expect(res.body.data.capacity).toBe(10);
  });

  test('devuelve 404 para ID inexistente', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/spaces/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/spaces/:id/deactivate', () => {
  test('admin desactiva un espacio', async () => {
    const space = await Space.create({
      name: 'Para desactivar', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00',
    });
    const res = await request(app)
      .patch(`/api/spaces/${space._id}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.active).toBe(false);
  });

  test('operator no puede desactivar (403)', async () => {
    const space = await Space.create({
      name: 'Para desactivar', type: 'sala', location: 'Sede A', capacity: 5, openTime: '08:00', closeTime: '18:00',
    });
    const res = await request(app)
      .patch(`/api/spaces/${space._id}/deactivate`)
      .set('Authorization', `Bearer ${operatorToken}`);
    expect(res.status).toBe(403);
  });
});
