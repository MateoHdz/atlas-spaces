const HttpError = require('../utils/HttpError');
const { verifyToken } = require('../utils/jwt');

// Protege endpoints: exige un JWT válido en el header Authorization.
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Token no proporcionado'));
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return next(HttpError.unauthorized('Token inválido o expirado'));
  }
}

// Autorización por rol. Debe usarse siempre después de requireAuth.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(HttpError.forbidden());
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
