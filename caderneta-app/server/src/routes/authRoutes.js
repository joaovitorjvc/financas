const express = require('express');
const authMiddleware = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const authController = require('../controllers/authController');
const { validateSendCode, validateRegister, validateLogin } = require('../validators/authValidator');

const router = express.Router();

router.post('/send-code', validateSendCode, asyncHandler(authController.sendCode));
router.post('/register', validateRegister, asyncHandler(authController.register));
router.post('/login', validateLogin, asyncHandler(authController.login));
router.get('/me', authMiddleware, asyncHandler(authController.me));

module.exports = router;
