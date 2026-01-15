const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const {
  createClass,
  updateClass,
  getClassAttendance,
  markClassAttendance
} = require('../controllers/classController');

const router = express.Router();

router.use(protect);
router.use(authorize('manager', 'owner'));

router.post('/', createClass);
router.put('/:id', updateClass);

router.get('/attendance/:id', getClassAttendance);
router.post('/attendance/mark', markClassAttendance);

module.exports = router;
