const express = require('express');
const {
	register,
	login,
	getMe,
	forgotPassword,
	resetPassword,
	verifyEmail
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);

module.exports = router;