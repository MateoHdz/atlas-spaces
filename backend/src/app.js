const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const healthRoutes = require('./modules/health/health.routes');
const authRoutes = require('./modules/auth/auth.routes');
const spacesRoutes = require('./modules/spaces/spaces.routes');
const reservationsRoutes = require('./modules/reservations/reservations.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/spaces', spacesRoutes);            // Ticket 2
  app.use('/api/reservations', reservationsRoutes); // Ticket 2 + 4
  app.use('/api/dashboard', dashboardRoutes);       // Ticket 3

  // Próximas fases:
  // (export vive dentro de reservations: GET /api/reservations/export) // Ticket 5

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
