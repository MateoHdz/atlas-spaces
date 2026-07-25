const authService = require('./auth.service');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  // JWT es stateless: no hay sesión en el servidor que invalidar.
  // El cliente simplemente descarta el token. Documentado en el README.
  res.status(204).send();
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me };
