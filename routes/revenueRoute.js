const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getRevenueChart } = require('../controllers/revenueController');

const router = express.Router();

router.use(protect);
router.use(authorize('owner'));

router.get('/revenue-chart', getRevenueChart);

module.exports = router;
