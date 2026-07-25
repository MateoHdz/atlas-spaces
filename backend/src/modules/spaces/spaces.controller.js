const service = require('./spaces.service');

async function list(req, res, next) {
  try {
    const spaces = await service.listSpaces(req.user.role);
    res.json({ data: spaces });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const space = await service.createSpace(req.body);
    res.status(201).json({ data: space });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const space = await service.updateSpace(req.params.id, req.body);
    res.json({ data: space });
  } catch (err) {
    next(err);
  }
}

async function deactivate(req, res, next) {
  try {
    const space = await service.deactivateSpace(req.params.id);
    res.json({ data: space });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, deactivate };
