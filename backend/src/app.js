const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);

  // Los siguientes módulos se montan en las fases correspondientes del roadmap:
  // app.use('/api/spaces', spacesRoutes);         // Fase 3
  // app.use('/api/reservations', reservationsRoutes); // Fase 3-4
  // app.use('/api/dashboard', dashboardRoutes);   // Fase 5
  // (export vive dentro de reservations: GET /api/reservations/export)

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
