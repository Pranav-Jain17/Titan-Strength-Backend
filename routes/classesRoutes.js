const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  getSchedule,
  createClass,
  updateClass,
  getClassAttendance,
  markClassAttendance,
  bookClass,
  cancelBooking
} = require('../controllers/classController');

const router = express.Router();

// Public: weekly schedule
router.get('/schedule', getSchedule);

// Protected routes
router.use(protect);

// Member booking
router.post('/:id/book', authorize('member'), bookClass);
router.delete('/:id/cancel', authorize('member'), cancelBooking);

// Manager/Owner class management
router.post('/', authorize('manager', 'owner'), createClass);
router.put('/:id', authorize('manager', 'owner'), updateClass);
router.get('/attendance/:id', authorize('manager', 'owner'), getClassAttendance);
router.post('/attendance/mark', authorize('manager', 'owner'), markClassAttendance);

module.exports = router;
