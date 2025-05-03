const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const {authMiddleware, verifyTokenScope, createRateLimiter} = require('../middlewares/auth.middleware');

const verifyCodeLimiter = createRateLimiter(
    5,
    10,
    'Muitas tentativas de verificação. Tente novamente em 10 minutos.'
);

router.post('/login', AuthController.login);
router.post('/verify-code', verifyCodeLimiter, verifyTokenScope('verify'), AuthController.checkCode);
router.post('/reset-password', AuthController.resetPassword);
router.get('/validate', authMiddleware, AuthController.validate);
router.get('/me', authMiddleware, AuthController.me);

module.exports = router;
