/**
 * Tests del módulo Dashboard (Ticket 3).
 * Verifica los endpoints de analítica y agregación:
 *  - /api/dashboard/summary
 *  - /api/dashboard/by-day
 *  - /api/dashboard/by-status
 *  - /api/dashboard/by-space
 */

process.env.JWT_SECRET = 'test-secret';

const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Space = require('../src/models/Space');
const Reservation = require('../src/models/Reservation');
const { signToken } = require('../src/utils/jwt');
const bcrypt = require('bcrypt');

let replSet;
let app;
let operatorToken;
let spaceA;
let spaceB;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
  app = createApp();

  const hash = await bcrypt.hash('pass123', 10);
  const user = await User.create({
    name: 'Operador',
    email: 'op@test.com',
    passwordHash: hash,
    role: 'operator',
    active: true,
  });

  operatorToken = signToken({ sub: user._id.toString(), role: 'operator' });

  spaceA = await Space.create({
    name: 'Sala Andes',
    type: 'sala',
    location: 'Centro',
    capacity: 6,
    openTime: '07:00',
    closeTime: '20:00',
  });

  spaceB = await Space.create({
    name: 'Oficina 101',
    type: 'oficina',
    location: 'Norte',
    capacity: 2,
    openTime: '08:00',
    closeTime: '18:00',
  });

  // Crear set de reservas de prueba
  // 1. Pending (2h)
  await Reservation.create({
    space: spaceA._id,
    title: 'Reserva 1',
    clientName: 'Cliente 1',
    clientEmail: 'c1@test.com',
    attendees: 3,
    startAt: new Date('2026-08-10T14:00:00Z'),
    endAt: new Date('2026-08-10T16:00:00Z'),
    status: 'pending',
    createdBy: user._id,
  });

  // 2. Confirmed (1h)
  await Reservation.create({
    space: spaceA._id,
    title: 'Reserva 2',
    clientName: 'Cliente 2',
    clientEmail: 'c2@test.com',
    attendees: 4,
    startAt: new Date('2026-08-10T17:00:00Z'),
    endAt: new Date('2026-08-10T18:00:00Z'),
    status: 'confirmed',
    createdBy: user._id,
  });

  // 3. Completed (3h) - Space B
  await Reservation.create({
    space: spaceB._id,
    title: 'Reserva 3',
    clientName: 'Cliente 3',
    clientEmail: 'c3@test.com',
    attendees: 1,
    startAt: new Date('2026-08-11T14:00:00Z'),
    endAt: new Date('2026-08-11T17:00:00Z'),
    status: 'completed',
    createdBy: user._id,
  });

  // 4. Cancelled (2h)
  await Reservation.create({
    space: spaceA._id,
    title: 'Reserva 4',
    clientName: 'Cliente 4',
    clientEmail: 'c4@test.com',
    attendees: 2,
    startAt: new Date('2026-08-11T18:00:00Z'),
    endAt: new Date('2026-08-11T20:00:00Z'),
    status: 'cancelled',
    createdBy: user._id,
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('GET /api/dashboard/summary', () => {
  test('rechaza sin autenticación con 401', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  test('retorna métricas de resumen acumuladas', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.totalReservations).toBe(4);
    expect(data.pendingReservations).toBe(1);
    expect(data.confirmedReservations).toBe(1);
    expect(data.completedReservations).toBe(1);
    expect(data.cancelledReservations).toBe(1);
    // Activas = 3/4 = 75%
    expect(data.occupancyRate).toBe(75);
    // Horas activas = 2h + 1h + 3h = 6h (excluye las 2h canceladas)
    expect(data.totalHoursBooked).toBe(6);
  });

  test('filtra por rango de fechas (from / to)', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary?from=2026-08-10T00:00:00Z&to=2026-08-10T23:59:59Z')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalReservations).toBe(2);
    expect(res.body.data.totalHoursBooked).toBe(3); // 2h + 1h
  });

  test('rechaza si from > to con 400', async () => {
    const res = await request(app)
      .get('/api/dashboard/summary?from=2026-08-15T00:00:00Z&to=2026-08-10T00:00:00Z')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/dashboard/by-day', () => {
  test('agrupa reservas por día local', async () => {
    const res = await request(app)
      .get('/api/dashboard/by-day')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('date');
    expect(res.body.data[0]).toHaveProperty('total');
  });
});

describe('GET /api/dashboard/by-status', () => {
  test('retorna distribución de reservas por estado con porcentaje', async () => {
    const res = await request(app)
      .get('/api/dashboard/by-status')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    // Cada elemento debe tener status, count, percentage
    const pendingItem = res.body.data.find((item) => item.status === 'pending');
    expect(pendingItem).toBeDefined();
    expect(pendingItem.count).toBe(1);
    expect(pendingItem.percentage).toBe(25);
  });
});

describe('GET /api/dashboard/by-space', () => {
  test('retorna reservas y horas acumuladas por espacio', async () => {
    const res = await request(app)
      .get('/api/dashboard/by-space')
      .set('Authorization', `Bearer ${operatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    const spaceAStats = res.body.data.find((s) => s.spaceName === 'Sala Andes');
    expect(spaceAStats).toBeDefined();
    expect(spaceAStats.totalReservations).toBe(3);
    // Horas no canceladas: 2h + 1h = 3h
    expect(spaceAStats.totalHours).toBe(3);

    const spaceBStats = res.body.data.find((s) => s.spaceName === 'Oficina 101');
    expect(spaceBStats).toBeDefined();
    expect(spaceBStats.totalReservations).toBe(1);
    expect(spaceBStats.totalHours).toBe(3);
  });
});
