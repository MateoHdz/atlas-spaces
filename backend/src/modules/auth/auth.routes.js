const { Router } = require('express');
const controller = require('./auth.controller');
const { loginSchema } = require('./auth.schema');
const validate = require('../../middlewares/validate');
const { requireAuth } = require('../../middlewares/auth');
const { loginLimiter } = require('../../middlewares/rateLimiter');

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
