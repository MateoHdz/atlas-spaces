class HttpError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code; // ej. 'VALIDATION_ERROR', 'RESERVATION_CONFLICT'
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new HttpError(400, code, message, details);
  }
  static unauthorized(message = 'No autenticado') {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'No tienes permiso para esta acción') {
    return new HttpError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Recurso no encontrado') {
    return new HttpError(404, 'NOT_FOUND', message);
  }
  static conflict(code, message, details) {
    return new HttpError(409, code, message, details);
  }
}

module.exports = HttpError;
