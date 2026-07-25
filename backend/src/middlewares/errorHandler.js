const HttpError = require('../utils/HttpError');

/**
 * Formato único de error para toda la API:
 * { error: { code, message, details? } }
 * El frontend puede confiar en esta forma sin importar qué módulo generó el error.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Error de validación de Mongoose no capturado explícitamente.
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }

  console.error('[unhandled error]', err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };
