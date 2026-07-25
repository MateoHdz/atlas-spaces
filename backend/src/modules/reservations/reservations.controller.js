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

module.exports = { list, getOne, create, update, cancel };
