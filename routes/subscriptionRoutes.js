const express = require('express');
const { 
  createSubscription, 
  getSubscriptions 
} = require('../controllers/subscriptionController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.route('/')
  .post(authorize('owner', 'manager'), createSubscription)
  .get(authorize('owner', 'manager'), getSubscriptions);

module.exports = router;