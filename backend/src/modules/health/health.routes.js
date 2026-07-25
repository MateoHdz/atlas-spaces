const { Router } = require('express');
const { isDbHealthy } = require('../../config/db');

const router = Router();

// GET /api/health
// No basta con "el proceso Node responde" — valida también la conexión a Mongo,
// que es la dependencia real que puede fallar en runtime.
router.get('/', (req, res) => {
  const dbHealthy = isDbHealthy();
  const status = dbHealthy ? 'ok' : 'degraded';
  res.status(dbHealthy ? 200 : 503).json({
    status,
    db: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
