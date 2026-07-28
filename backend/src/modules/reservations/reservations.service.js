const mongoose = require('mongoose');
const Reservation = require('../../models/Reservation');
const Space = require('../../models/Space');
const HttpError = require('../../utils/HttpError');
const { isWithinOperatingHours } = require('../../utils/timezone');

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Verifica todas las reglas de negocio antes de crear o editar una reserva.
 * Se llama DENTRO de la sesión/transacción para que la consulta de solapamiento
 * sea atómica respecto a la escritura posterior.
 *
 * @param {object} data     - datos de la reserva (ya convertidos a Date)
 * @param {object} space    - documento del espacio obtenido previamente
 * @param {string|null} excludeId - ID de reserva a excluir en solapamiento (para PUT)
 * @param {object} session  - sesión de Mongoose (para que la query entre en la tx)
 */
async function validateBusinessRules(data, space, excludeId, session) {
  const { startAt, endAt, attendees } = data;

  // 1. Espacio activo
  if (!space.active) {
    throw HttpError.badRequest('SPACE_INACTIVE', 'El espacio no está disponible');
  }

  // 2. No en el pasado (startAt >= ahora, con 1 min de tolerancia)
  const now = new Date(Date.now() - 60_000);
  if (startAt < now) {
    throw HttpError.badRequest('PAST_DATE', 'No se puede reservar en el pasado');
  }

  // 3. Capacidad
  if (attendees > space.capacity) {
    throw HttpError.badRequest(
      'CAPACITY_EXCEEDED',
      `El espacio tiene capacidad máxima de ${space.capacity} personas`
    );
  }

  // 4. Horario operativo del espacio (validado en hora local America/Bogota)
  if (!isWithinOperatingHours(startAt, endAt, space.openTime, space.closeTime)) {
    throw HttpError.badRequest(
      'OUTSIDE_HOURS',
      `La reserva debe estar dentro del horario del espacio (${space.openTime} - ${space.closeTime})`
    );
  }

  // 5. Solapamiento: otra reserva activa en el mismo espacio que se cruce en el tiempo
  //    Criterio: existe reserva donde startAt < endAt_nuevo AND endAt > startAt_nuevo
  //    (se excluyen cancelled y la propia reserva en modo edición)
  const overlapFilter = {
    space: space._id,
    status: { $nin: ['cancelled', 'completed'] },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };
  if (excludeId) {
    overlapFilter._id = { $ne: excludeId };
  }

  const overlap = await Reservation.findOne(overlapFilter).session(session).lean();
  if (overlap) {
    throw HttpError.conflict(
      'CONFLICT',
      'El espacio ya tiene una reserva activa en ese rango horario'
    );
  }
}

// Helper centralizado de construcciones de filtro para listado y exportación
function buildReservationFilter(query) {
  const { status, spaceId, from, to, search } = query;
  const filter = {};

  if (status) filter.status = status;
  if (spaceId) filter.space = spaceId;

  if (from || to) {
    filter.startAt = {};
    if (from) filter.startAt.$gte = new Date(from);
    if (to) filter.startAt.$lte = new Date(to);
  }

  if (search) {
    const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');
    filter.$or = [{ title: regex }, { clientName: regex }];
  }

  return filter;
}

/** Escapa un valor para formateo seguro en CSV */
function escapeCSVCell(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// CRUD público
// ---------------------------------------------------------------------------

/**
 * Lista reservas con paginación, filtros y orden.
 *
 * Query params soportados:
 *   page, limit, status, spaceId, from, to, search (clientName/title), sortBy, sortOrder
 */
async function listReservations(query) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'startAt',
    sortOrder = 'asc',
  } = query;

  const filter = buildReservationFilter(query);

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const sortDirection = sortOrder === 'desc' ? -1 : 1;
  const allowedSortFields = ['startAt', 'endAt', 'createdAt', 'status', 'clientName'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'startAt';

  const [data, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .populate('space', 'name type location')
      .populate('createdBy', 'name email')
      .lean(),
    Reservation.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * Exporta todas las reservas que coincidan con los filtros a formato CSV.
 */
async function exportReservationsCSV(query) {
  const { toLocalDateTimeString } = require('../../utils/timezone');
  const filter = buildReservationFilter(query);

  const reservations = await Reservation.find(filter)
    .sort({ startAt: 1 })
    .populate('space', 'name location')
    .populate('createdBy', 'name email')
    .lean();

  const headers = [
    'ID Reserva',
    'Título',
    'Espacio',
    'Ubicación',
    'Cliente',
    'Email Cliente',
    'Asistentes',
    'Fecha Inicio (Bogotá)',
    'Fecha Fin (Bogotá)',
    'Estado',
    'Creado por',
    'Fecha de Creación (Bogotá)',
  ];

  const rows = reservations.map((r) => [
    r._id.toString(),
    r.title,
    r.space?.name || 'N/A',
    r.space?.location || 'N/A',
    r.clientName,
    r.clientEmail,
    r.attendees,
    toLocalDateTimeString(r.startAt),
    toLocalDateTimeString(r.endAt),
    r.status,
    r.createdBy?.name || 'N/A',
    toLocalDateTimeString(r.createdAt),
  ]);

  const csvLines = [
    headers.map(escapeCSVCell).join(','),
    ...rows.map((row) => row.map(escapeCSVCell).join(',')),
  ];

  // \uFEFF añade UTF-8 Byte Order Mark (BOM) para compatibilidad con Excel en Windows
  return '\uFEFF' + csvLines.join('\n');
}

/**
 * Obtiene una reserva por ID. Lanza 404 si no existe.
 */
async function getReservationById(id) {
  const reservation = await Reservation.findById(id)
    .populate('space', 'name type location capacity openTime closeTime')
    .populate('createdBy', 'name email')
    .lean();

  if (!reservation) {
    throw HttpError.notFound('Reserva no encontrada');
  }
  return reservation;
}

/**
 * Crea una reserva nueva.
 * Usa transacción para cerrar la ventana de carrera en solapamiento.
 * Posee un fallback automático para entornos locales de MongoDB sin replica set.
 */
async function createReservation(data, userId) {
  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  const space = await Space.findById(data.space).lean();
  if (!space) {
    throw HttpError.notFound('Espacio no encontrado');
  }

  const session = await mongoose.startSession();
  let reservation;

  try {
    await session.withTransaction(async () => {
      await validateBusinessRules({ ...data, startAt, endAt }, space, null, session);

      const [created] = await Reservation.create(
        [
          {
            space: data.space,
            title: data.title,
            clientName: data.clientName,
            clientEmail: data.clientEmail,
            attendees: data.attendees,
            startAt,
            endAt,
            status: 'pending',
            notes: data.notes,
            createdBy: userId,
          },
        ],
        { session }
      );
      reservation = created;
    });
  } catch (err) {
    if (err.message && err.message.includes('Transaction numbers are only allowed')) {
      await validateBusinessRules({ ...data, startAt, endAt }, space, null, null);
      reservation = await Reservation.create({
        space: data.space,
        title: data.title,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        attendees: data.attendees,
        startAt,
        endAt,
        status: 'pending',
        notes: data.notes,
        createdBy: userId,
      });
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  // Populate fuera de la transacción para la respuesta
  return Reservation.findById(reservation._id)
    .populate('space', 'name type location')
    .populate('createdBy', 'name email')
    .lean();
}

/**
 * Actualiza una reserva existente.
 * Re-valida todas las reglas de negocio dentro de una transacción.
 * Posee un fallback automático para entornos locales de MongoDB sin replica set.
 */
async function updateReservation(id, data, userId) {
  const existing = await Reservation.findById(id).lean();
  if (!existing) {
    throw HttpError.notFound('Reserva no encontrada');
  }

  if (existing.status === 'cancelled') {
    throw HttpError.badRequest('INVALID_STATUS', 'No se puede editar una reserva cancelada');
  }

  const spaceId = data.space || existing.space;
  const space = await Space.findById(spaceId).lean();
  if (!space) {
    throw HttpError.notFound('Espacio no encontrado');
  }

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);

  const session = await mongoose.startSession();
  let updated;

  try {
    await session.withTransaction(async () => {
      // Solo re-validamos solapamiento/horario/capacidad si cambian fechas o espacio
      await validateBusinessRules({ ...data, startAt, endAt }, space, id, session);

      updated = await Reservation.findByIdAndUpdate(
        id,
        {
          space: spaceId,
          title: data.title,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          attendees: data.attendees,
          startAt,
          endAt,
          notes: data.notes,
          ...(data.status ? { status: data.status } : {}),
        },
        { new: true, runValidators: true, session }
      );
    });
  } catch (err) {
    if (err.message && err.message.includes('Transaction numbers are only allowed')) {
      await validateBusinessRules({ ...data, startAt, endAt }, space, id, null);
      updated = await Reservation.findByIdAndUpdate(
        id,
        {
          space: spaceId,
          title: data.title,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          attendees: data.attendees,
          startAt,
          endAt,
          notes: data.notes,
          ...(data.status ? { status: data.status } : {}),
        },
        { new: true, runValidators: true }
      );
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  return Reservation.findById(updated._id)
    .populate('space', 'name type location')
    .populate('createdBy', 'name email')
    .lean();
}

/**
 * Cancela una reserva (solo cambia status a 'cancelled').
 */
async function cancelReservation(id) {
  const reservation = await Reservation.findById(id).lean();
  if (!reservation) {
    throw HttpError.notFound('Reserva no encontrada');
  }

  if (['cancelled', 'completed'].includes(reservation.status)) {
    throw HttpError.badRequest(
      'INVALID_STATUS',
      `No se puede cancelar una reserva con estado "${reservation.status}"`
    );
  }

  const updated = await Reservation.findByIdAndUpdate(
    id,
    { status: 'cancelled' },
    { new: true }
  )
    .populate('space', 'name type location')
    .populate('createdBy', 'name email')
    .lean();

  return updated;
}

module.exports = {
  listReservations,
  exportReservationsCSV,
  getReservationById,
  createReservation,
  updateReservation,
  cancelReservation,
};
