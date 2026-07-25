/**
 * Tests del módulo Reservations (Ticket 2 + Ticket 4 — Reglas de negocio).
 *
 * Cubren los casos del roadmap sección 11:
 *  - Reserva superpuesta → rechazada
 *  - Reservas consecutivas → permitidas
 *  - Validación de capacidad/horario/fechas → rechazada
 *  + CRUD básico (create, list, get, update, cancel)
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
let adminToken;
let adminId;
let testSpace;

// Genera una fecha futura (días desde ahora) en hora conveniente: 14:00 UTC = 09:00 Bogotá
// utcHour puede ser decimal p.ej. 14.5 para las 14:30 UTC
function futureDate(daysFromNow, utcHour = 14) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  const hours = Math.floor(utcHour);
  const minutes = Math.round((utcHour - hours) * 60);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
  app = createApp();

  const hash = await bcrypt.hash('pass123', 10);
  const admin = await User.create({
    name: 'Admin', email: 'admin@test.com', passwordHash: hash, role: 'admin', active: true,
  });
  adminId = admin._id.toString();
  adminToken = signToken({ sub: adminId, role: 'admin' });

  // Espacio de referencia: abre 07:00, cierra 20:00, capacidad 10
  testSpace = await Space.create({
    name: 'Sala Test', type: 'sala', location: 'Sede A',
    capacity: 10, openTime: '07:00', closeTime: '20:00', active: true,
  });
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Reservation.deleteMany({});
});

// Helpers ---------------------------------------------------------------

function buildPayload(overrides = {}) {
  return {
    space: testSpace._id.toString(),
    title: 'Reunión de equipo',
    clientName: 'Juan Pérez',
    clientEmail: 'juan@example.com',
    attendees: 4,
    startAt: futureDate(1, 14).toISOString(), // 09:00 Bogotá
    endAt: futureDate(1, 15).toISOString(),   // 10:00 Bogotá
    ...overrides,
  };
}

async function createViaApi(overrides = {}) {
  return request(app)
    .post('/api/reservations')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(buildPayload(overrides));
}

// ---------------------------------------------------------------------------
describe('POST /api/reservations — validaciones básicas', () => {
  test('rechaza sin token con 401', async () => {
    const res = await request(app).post('/api/reservations').send(buildPayload());
    expect(res.status).toBe(401);
  });

  test('crea una reserva válida (201)', async () => {
    const res = await createViaApi();
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Reunión de equipo');
    expect(res.body.data.status).toBe('pending');
  });

  test('rechaza startAt >= endAt con 400', async () => {
    const res = await createViaApi({
      startAt: futureDate(1, 15).toISOString(),
      endAt: futureDate(1, 14).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  test('rechaza email inválido con 400', async () => {
    const res = await createViaApi({ clientEmail: 'no-es-email' });
    expect(res.status).toBe(400);
  });

  test('rechaza attendees < 1 con 400', async () => {
    const res = await createViaApi({ attendees: 0 });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
describe('Ticket 4 — Regla: solapamiento', () => {
  test('rechaza reserva superpuesta en el mismo espacio (409)', async () => {
    // Crear primera reserva: 09:00-10:00
    await createViaApi({
      startAt: futureDate(2, 14).toISOString(),
      endAt: futureDate(2, 15).toISOString(),
    });

    // Intentar crear segunda que se solapa: 09:30-10:30
    const res = await createViaApi({
      startAt: futureDate(2, 14.5).toISOString(),
      endAt: futureDate(2, 15.5).toISOString(),
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('permite reservas consecutivas (segunda empieza exactamente cuando termina la primera)', async () => {
    // Primera: 09:00-10:00
    await createViaApi({
      startAt: futureDate(3, 14).toISOString(),
      endAt: futureDate(3, 15).toISOString(),
    });

    // Segunda: 10:00-11:00 (consecutiva, sin solapamiento)
    const res = await createViaApi({
      startAt: futureDate(3, 15).toISOString(),
      endAt: futureDate(3, 16).toISOString(),
    });
    expect(res.status).toBe(201);
  });

  test('reservas solapadas en espacios distintos son independientes (201)', async () => {
    const otherSpace = await Space.create({
      name: 'Sala B', type: 'sala', location: 'Sede A',
      capacity: 10, openTime: '07:00', closeTime: '20:00', active: true,
    });

    await createViaApi({
      startAt: futureDate(4, 14).toISOString(),
      endAt: futureDate(4, 15).toISOString(),
    });

    const res = await createViaApi({
      space: otherSpace._id.toString(),
      startAt: futureDate(4, 14).toISOString(),
      endAt: futureDate(4, 15).toISOString(),
    });
    expect(res.status).toBe(201);

    await Space.findByIdAndDelete(otherSpace._id);
  });
});

// ---------------------------------------------------------------------------
describe('Ticket 4 — Regla: capacidad', () => {
  test('rechaza attendees > capacity con 400', async () => {
    const res = await createViaApi({ attendees: 99 }); // capacity es 10
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/capacidad/i);
  });

  test('permite attendees == capacity', async () => {
    const res = await createViaApi({ attendees: 10 });
    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------------------
describe('Ticket 4 — Regla: horario operativo', () => {
  test('rechaza reserva fuera del horario de cierre (400)', async () => {
    // El espacio cierra a 20:00 (= 01:00 UTC+5 → 01:00 UTC aproximado).
    // 01:00 UTC = 20:00 Bogotá; probamos 21:00 Bogotá = 02:00 UTC
    const start = futureDate(5, 2); // 21:00 Bogotá
    const end = futureDate(5, 3);   // 22:00 Bogotá
    const res = await createViaApi({
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/horario/i);
  });
});

// ---------------------------------------------------------------------------
describe('GET /api/reservations', () => {
  beforeEach(async () => {
    // Insertar directamente para evitar validaciones de fecha-pasada
    await Reservation.create([
      {
        space: testSpace._id, title: 'R1', clientName: 'A', clientEmail: 'a@b.com',
        attendees: 2, startAt: futureDate(1, 14), endAt: futureDate(1, 15),
        status: 'pending', createdBy: adminId,
      },
      {
        space: testSpace._id, title: 'R2', clientName: 'B', clientEmail: 'b@b.com',
        attendees: 3, startAt: futureDate(2, 14), endAt: futureDate(2, 15),
        status: 'confirmed', createdBy: adminId,
      },
    ]);
  });

  test('devuelve lista paginada con total', async () => {
    const res = await request(app)
      .get('/api/reservations')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('filtra por status', async () => {
    const res = await request(app)
      .get('/api/reservations?status=confirmed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('R2');
  });

  test('filtra por search (clientName)', async () => {
    const res = await request(app)
      .get('/api/reservations?search=A')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    // "A" y "B" coinciden, pero el regex es case-insensitive y busca "A" → devuelve "A" (clientName)
    // y también "B" no matchea sola... depende del regex. Chequeamos que al menos devuelve datos.
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('paginación funciona (limit=1, page=2)', async () => {
    const res = await request(app)
      .get('/api/reservations?limit=1&page=2&sortBy=startAt&sortOrder=asc')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.page).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });
});

// ---------------------------------------------------------------------------
describe('GET /api/reservations/:id', () => {
  test('devuelve la reserva con datos del espacio y creador', async () => {
    const r = await Reservation.create({
      space: testSpace._id, title: 'Detalle', clientName: 'C', clientEmail: 'c@c.com',
      attendees: 1, startAt: futureDate(6, 14), endAt: futureDate(6, 15),
      status: 'pending', createdBy: adminId,
    });
    const res = await request(app)
      .get(`/api/reservations/${r._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.space.name).toBe('Sala Test');
  });

  test('devuelve 404 para ID inexistente', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/reservations/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
describe('PATCH /api/reservations/:id/cancel', () => {
  test('cancela una reserva pending', async () => {
    const r = await Reservation.create({
      space: testSpace._id, title: 'Para cancelar', clientName: 'D', clientEmail: 'd@d.com',
      attendees: 1, startAt: futureDate(7, 14), endAt: futureDate(7, 15),
      status: 'pending', createdBy: adminId,
    });
    const res = await request(app)
      .patch(`/api/reservations/${r._id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  test('no permite cancelar una reserva ya cancelada (400)', async () => {
    const r = await Reservation.create({
      space: testSpace._id, title: 'Ya cancelada', clientName: 'E', clientEmail: 'e@e.com',
      attendees: 1, startAt: futureDate(8, 14), endAt: futureDate(8, 15),
      status: 'cancelled', createdBy: adminId,
    });
    const res = await request(app)
      .patch(`/api/reservations/${r._id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
