const bcrypt = require('bcrypt');
const { connectDB } = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Space = require('../models/Space');
const Reservation = require('../models/Reservation');

const SALT_ROUNDS = 10;

async function seed() {
  await connectDB();
  console.log('[seed] Limpiando colecciones...');
  await Promise.all([
    User.deleteMany({}),
    Space.deleteMany({}),
    Reservation.deleteMany({}),
  ]);

  console.log('[seed] Creando usuarios...');
  const [adminPasswordHash, operatorPasswordHash] = await Promise.all([
    bcrypt.hash('Admin123!', SALT_ROUNDS),
    bcrypt.hash('Operator123!', SALT_ROUNDS),
  ]);

  const [admin, operator] = await User.create([
    {
      name: 'Ana Torres',
      email: 'admin@atlasspaces.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      active: true,
    },
    {
      name: 'Carlos Ruiz',
      email: 'operador@atlasspaces.com',
      passwordHash: operatorPasswordHash,
      role: 'operator',
      active: true,
    },
  ]);

  console.log('[seed] Creando espacios...');
  const spaces = await Space.create([
    { name: 'Sala Andes', type: 'sala', location: 'Sede Bogotá Centro', capacity: 6, openTime: '07:00', closeTime: '20:00' },
    { name: 'Sala Pacífico', type: 'sala', location: 'Sede Bogotá Centro', capacity: 8, openTime: '07:00', closeTime: '20:00' },
    { name: 'Oficina Privada 101', type: 'oficina', location: 'Sede Bogotá Norte', capacity: 2, openTime: '08:00', closeTime: '18:00' },
    { name: 'Oficina Privada 102', type: 'oficina', location: 'Sede Bogotá Norte', capacity: 4, openTime: '08:00', closeTime: '18:00' },
    { name: 'Auditorio Central', type: 'auditorio', location: 'Sede Bogotá Centro', capacity: 40, openTime: '08:00', closeTime: '21:00' },
  ]);

  console.log('[seed] Creando reservas de ejemplo...');
  const statuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  const reservations = [];

  // Genera 20 reservas distribuidas en los últimos 10 días y próximos 10 días,
  // con distintos espacios y estados, suficientes para probar dashboard y filtros.
  for (let i = 0; i < 20; i += 1) {
    const space = spaces[i % spaces.length];
    const dayOffset = i - 10; // de -10 a +9 días respecto a hoy
    const baseDate = new Date();
    baseDate.setUTCDate(baseDate.getUTCDate() + dayOffset);
    baseDate.setUTCHours(14, 0, 0, 0); // 09:00 America/Bogota aprox, dentro de horario

    const startAt = new Date(baseDate);
    const endAt = new Date(baseDate);
    endAt.setUTCHours(endAt.getUTCHours() + 1);

    const status = dayOffset < 0
      ? statuses[i % statuses.length] // reservas pasadas: cualquier estado
      : (i % 4 === 3 ? 'cancelled' : (i % 3 === 0 ? 'pending' : 'confirmed')); // futuras: mezcla realista

    reservations.push({
      space: space._id,
      title: `Reserva demo ${i + 1}`,
      clientName: `Cliente ${i + 1}`,
      clientEmail: `cliente${i + 1}@example.com`,
      attendees: Math.min(space.capacity, (i % space.capacity) + 1),
      startAt,
      endAt,
      status,
      createdBy: i % 2 === 0 ? admin._id : operator._id,
    });
  }

  await Reservation.create(reservations);

  console.log('[seed] Listo:');
  console.log(`  - ${await User.countDocuments()} usuarios`);
  console.log(`  - ${await Space.countDocuments()} espacios`);
  console.log(`  - ${await Reservation.countDocuments()} reservas`);
  console.log('[seed] Credenciales de prueba:');
  console.log('  admin@atlasspaces.com / Admin123!');
  console.log('  operador@atlasspaces.com / Operator123!');

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error('[seed] Error:', err);
  process.exit(1);
});
