const express = require('express');
const { 
  getOwnerDashboard, 
  getManagerDashboard, 
  getMemberDashboard,
  getTrainerDashboard
} = require('../controllers/dashboardController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Owner Route
router.get('/owner', authorize('owner'), getOwnerDashboard);

// Manager Route
router.get('/manager', authorize('manager', 'owner'), getManagerDashboard);

// Member Route
router.get('/member', authorize('member'), getMemberDashboard);

// Trainer Route
router.get('/trainer', authorize('trainer', 'manager', 'owner'), getTrainerDashboard);

module.exports = router;