const rateLimit = require('express-rate-limit');

// 10 intentos por 15 minutos por IP. Mitigación básica de fuerza bruta,
// no un sistema de detección de abuso - suficiente para el alcance de este proyecto.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.',
    },
  },
});

module.exports = { loginLimiter };
