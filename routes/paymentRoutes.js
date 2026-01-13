const express = require('express');
const { getCheckoutSession } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect); 

router.get('/checkout-session/:planId', getCheckoutSession);

module.exports = router;