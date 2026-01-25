const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  getMe,
  getMySubscription,
  getMyStats,
  getMyAttendance,
  getMyPaymentHistory,
  getMyBookings,
  updateMyProfile
} = require('../controllers/memberController');

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.get('/subscription', getMySubscription);
router.get('/stats', getMyStats);
router.get('/attendance', getMyAttendance);
router.get('/payment-history', getMyPaymentHistory);
router.get('/my-bookings', getMyBookings);

router.put('/profile', authorize('member'), updateMyProfile);

module.exports = router;
