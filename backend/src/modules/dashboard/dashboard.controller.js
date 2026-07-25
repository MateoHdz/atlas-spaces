const service = require('./dashboard.service');

async function getSummary(req, res, next) {
  try {
    const { from, to } = req.query;
    const summary = await service.getSummary(from, to);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}

async function getByDay(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await service.getByDay(from, to);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getByStatus(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await service.getByStatus(from, to);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

async function getBySpace(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await service.getBySpace(from, to);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSummary,
  getByDay,
  getByStatus,
  getBySpace,
};
