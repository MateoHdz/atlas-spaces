const { Router } = require('express');
const controller = require('./reservations.controller');
const { createReservationSchema, updateReservationSchema } = require('./reservations.schema');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');

const router = Router();

// Todos los endpoints exigen autenticación
router.use(requireAuth);

// GET /api/reservations?page&limit&status&spaceId&from&to&search&sortBy&sortOrder
router.get('/', controller.list);

// GET /api/reservations/export?status&spaceId&from&to&search
router.get('/export', controller.exportCSV);

// GET /api/reservations/:id
router.get('/:id', controller.getOne);

// POST /api/reservations
router.post('/', validate(createReservationSchema), controller.create);

// PUT /api/reservations/:id
router.put('/:id', validate(updateReservationSchema), controller.update);

// PATCH /api/reservations/:id/cancel
router.patch('/:id/cancel', controller.cancel);

module.exports = router;
