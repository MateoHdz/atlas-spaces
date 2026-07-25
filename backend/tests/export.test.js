/**
 * Tests del endpoint de exportación CSV (Ticket 5).
 * GET /api/reservations/export
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
let token;
let space;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
  app = createApp();

  const hash = await bcrypt.hash('pass123', 10);
  const user = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    passwordHash: hash,
    role: 'admin',
    active: true,
  });

  token = signToken({ sub: user._id.toString(), role: 'admin' });

  space = await Space.create({
    name: 'Sala, Con Coma',
    type: 'sala',
    location: 'Sede Centro',
    capacity: 10,
    openTime: '07:00',
    closeTime: '20:00',
  });

  await Reservation.create([
    {
      space: space._id,
      title: 'Reunión Alpha',
      clientName: 'Juan Pérez',
      clientEmail: 'juan@test.com',
      attendees: 5,
      startAt: new Date('2026-08-01T14:00:00Z'),
      endAt: new Date('2026-08-01T15:00:00Z'),
      status: 'confirmed',
      createdBy: user._id,
    },
    {
      space: space._id,
      title: 'Reunión Beta',
      clientName: 'Maria Gomez',
      clientEmail: 'maria@test.com',
      attendees: 2,
      startAt: new Date('2026-08-02T14:00:00Z'),
      endAt: new Date('2026-08-02T15:00:00Z'),
      status: 'cancelled',
      createdBy: user._id,
    },
  ]);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('GET /api/reservations/export', () => {
  test('rechaza petición anónima con 401', async () => {
    const res = await request(app).get('/api/reservations/export');
    expect(res.status).toBe(401);
  });

  test('retorna archivo CSV con cabecera y codificación correcta', async () => {
    const res = await request(app)
      .get('/api/reservations/export')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="reservaciones_atlas_spaces.csv"/);

    // Debe contener el UTF-8 BOM \uFEFF y encabezados
    expect(res.text.startsWith('\uFEFF')).toBe(true);
    expect(res.text).toContain('ID Reserva,Título,Espacio,Ubicación');
    expect(res.text).toContain('Reunión Alpha');
    expect(res.text).toContain('Reunión Beta');
    // "Sala, Con Coma" debe estar encerrada entre comillas por la coma
    expect(res.text).toContain('"Sala, Con Coma"');
  });

  test('aplica los mismos filtros de búsqueda que el listado (ej. status=confirmed)', async () => {
    const res = await request(app)
      .get('/api/reservations/export?status=confirmed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Reunión Alpha');
    expect(res.text).not.toContain('Reunión Beta');
  });

  test('aplica filtro de búsqueda por texto (search=Maria)', async () => {
    const res = await request(app)
      .get('/api/reservations/export?search=Maria')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('Reunión Beta');
    expect(res.text).not.toContain('Reunión Alpha');
  });
});
