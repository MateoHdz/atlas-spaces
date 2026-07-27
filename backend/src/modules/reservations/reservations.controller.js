const service = require('./reservations.service');

async function list(req, res, next) {
  try {
    const result = await service.listReservations(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const reservation = await service.getReservationById(req.params.id);
    res.json({ data: reservation });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const reservation = await service.createReservation(req.body, req.user.id);
    res.status(201).json({ data: reservation });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const reservation = await service.updateReservation(req.params.id, req.body, req.user.id);
    res.json({ data: reservation });
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const reservation = await service.cancelReservation(req.params.id);
    res.json({ data: reservation });
  } catch (err) {
    next(err);
  }
}

async function exportCSV(req, res, next) {
  try {
    const csvContent = await service.exportReservationsCSV(req.query);
    const exportDate = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reservaciones_atlas_spaces_${exportDate}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getOne, create, update, cancel, exportCSV };
