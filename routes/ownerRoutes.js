const express = require('express');
const { protect, authorize } = require('../middleware/auth');

const { getRevenueChart } = require('../controllers/revenueController');
const { getManagers } = require('../controllers/ownerController');

const router = express.Router();

router.use(protect);
router.use(authorize('owner'));

// Existing owner analytics
router.get('/revenue-chart', getRevenueChart);

// Owner lists
router.get('/managers', getManagers);

module.exports = router;
