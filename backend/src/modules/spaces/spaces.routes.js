const { Router } = require('express');
const controller = require('./spaces.controller');
const { spaceBodySchema } = require('./spaces.schema');
const validate = require('../../middlewares/validate');
const { requireAuth, requireRole } = require('../../middlewares/auth');

const router = Router();

// Todos los endpoints exigen autenticación
router.use(requireAuth);

// GET /api/spaces — admin ve activos + inactivos; operator solo activos
router.get('/', controller.list);

// Las siguientes rutas son solo para admin
router.post('/', requireRole('admin'), validate(spaceBodySchema), controller.create);
router.put('/:id', requireRole('admin'), validate(spaceBodySchema), controller.update);
router.patch('/:id/deactivate', requireRole('admin'), controller.deactivate);

module.exports = router;
