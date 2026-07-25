const { Router } = require('express');
const controller = require('./dashboard.controller');
const { dashboardQuerySchema } = require('./dashboard.schema');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');

const router = Router();

// Todos los endpoints de dashboard requieren autenticación
router.use(requireAuth);

const validateQuery = validate(dashboardQuerySchema, 'query');

// GET /api/dashboard/summary ?from&to
router.get('/summary', validateQuery, controller.getSummary);

// GET /api/dashboard/by-day ?from&to
router.get('/by-day', validateQuery, controller.getByDay);

// GET /api/dashboard/by-status ?from&to
router.get('/by-status', validateQuery, controller.getByStatus);

// GET /api/dashboard/by-space ?from&to
router.get('/by-space', validateQuery, controller.getBySpace);

module.exports = router;
