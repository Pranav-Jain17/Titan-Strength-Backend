const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const { checkIn } = require('../controllers/attendanceController');

const router = express.Router();

router.use(protect);
router.use(authorize('member'));

router.post('/check-in', checkIn);

module.exports = router;
