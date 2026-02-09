const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  getSchedule,
  createClass,
  updateClass,
  deleteClass,
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

// Trainer class management
router.post('/', authorize('trainer'), createClass);
router.put('/:id', authorize('trainer'), updateClass);
router.delete('/:id', authorize('trainer'), deleteClass);
router.get('/attendance/:id', authorize('trainer'), getClassAttendance);
router.post('/attendance/mark', authorize('trainer'), markClassAttendance);

module.exports = router;
