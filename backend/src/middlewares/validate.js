const HttpError = require('../utils/HttpError');

// Valida req[source] (body|query|params) contra un schema de Zod.
// Reemplaza req[source] por los datos ya parseados/normalizados (ej. email en lowercase).
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(HttpError.badRequest('VALIDATION_ERROR', 'Datos de entrada inválidos', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
