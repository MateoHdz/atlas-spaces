const Reservation = require('../../models/Reservation');
const env = require('../../config/env');

/**
 * Construye el filtro de fecha ($match) para pipelines de agregación.
 */
function buildDateMatch(from, to) {
  if (!from && !to) return {};
  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  return { startAt: dateFilter };
}

/**
 * Resumen general de métricas clave.
 * - Total de reservas
 * - Conteo por estado (pending, confirmed, completed, cancelled)
 * - Tasa de ocupación/confirmación (%)
 * - Total de horas reservadas (excluye canceladas)
 */
async function getSummary(from, to) {
  const match = buildDateMatch(from, to);

  const stats = await Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalHours: {
          $sum: {
            $cond: [
              { $ne: ['$status', 'cancelled'] },
              { $divide: [{ $subtract: ['$endAt', '$startAt'] }, 1000 * 60 * 60] },
              0,
            ],
          },
        },
      },
    },
  ]);

  if (!stats || stats.length === 0) {
    return {
      totalReservations: 0,
      pendingReservations: 0,
      confirmedReservations: 0,
      completedReservations: 0,
      cancelledReservations: 0,
      occupancyRate: 0,
      totalHoursBooked: 0,
    };
  }

  const res = stats[0];
  const activeCount = res.confirmed + res.completed + res.pending;
  const occupancyRate = res.total > 0 ? Number(((activeCount / res.total) * 100).toFixed(2)) : 0;

  return {
    totalReservations: res.total,
    pendingReservations: res.pending,
    confirmedReservations: res.confirmed,
    completedReservations: res.completed,
    cancelledReservations: res.cancelled,
    occupancyRate,
    totalHoursBooked: Number(res.totalHours.toFixed(2)),
  };
}

/**
 * Agregación de reservas agrupadas por fecha en horario local (America/Bogota).
 */
async function getByDay(from, to) {
  const match = buildDateMatch(from, to);

  const data = await Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$startAt',
            timezone: env.timezone,
          },
        },
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        total: 1,
        pending: 1,
        confirmed: 1,
        completed: 1,
        cancelled: 1,
      },
    },
  ]);

  return data;
}

/**
 * Distribución de reservas agrupadas por estado.
 */
async function getByStatus(from, to) {
  const match = buildDateMatch(from, to);

  const totalCount = await Reservation.countDocuments(match);
  if (totalCount === 0) return [];

  const data = await Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return data.map((item) => ({
    status: item._id,
    count: item.count,
    percentage: Number(((item.count / totalCount) * 100).toFixed(2)),
  }));
}

/**
 * Reservas acumuladas por espacio.
 */
async function getBySpace(from, to) {
  const match = buildDateMatch(from, to);

  const data = await Reservation.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$space',
        totalReservations: { $sum: 1 },
        totalHours: {
          $sum: {
            $cond: [
              { $ne: ['$status', 'cancelled'] },
              { $divide: [{ $subtract: ['$endAt', '$startAt'] }, 1000 * 60 * 60] },
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'spaces',
        localField: '_id',
        foreignField: '_id',
        as: 'spaceInfo',
      },
    },
    { $unwind: '$spaceInfo' },
    {
      $project: {
        _id: 0,
        spaceId: '$_id',
        spaceName: '$spaceInfo.name',
        spaceType: '$spaceInfo.type',
        location: '$spaceInfo.location',
        totalReservations: 1,
        totalHours: { $round: ['$totalHours', 2] },
      },
    },
    { $sort: { totalReservations: -1 } },
  ]);

  return data;
}

module.exports = {
  getSummary,
  getByDay,
  getByStatus,
  getBySpace,
};
