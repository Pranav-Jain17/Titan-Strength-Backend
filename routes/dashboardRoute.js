const express = require('express');
const { 
  getOwnerDashboard, 
  getManagerDashboard, 
  getMemberDashboard 
} = require('../controllers/dashboardController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Owner Route
router.get('/owner', authorize('owner'), getOwnerDashboard);

// Manager Route
router.get('/manager', authorize('manager', 'owner'), getManagerDashboard);

// Member Route
router.get('/member', authorize('member', 'user'), getMemberDashboard);

module.exports = router;