const express = require('express');
const { protect } = require('../middleware/auth');

const {
	getRazorpayKey,
	createRazorpayOrder,
	verifyRazorpayPaymentAndSubscribe
} = require('../controllers/paymentController');

const router = express.Router();

router.use(protect);

router.get('/razorpay/key', getRazorpayKey);
router.post('/razorpay/order', createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayPaymentAndSubscribe);

module.exports = router;