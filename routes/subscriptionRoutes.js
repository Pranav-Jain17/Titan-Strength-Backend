const express = require('express');
const {
	createSubscription,
	getSubscriptions,
	getMySubscriptions
} = require('../controllers/subscriptionController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

// Manual overrides: owner/manager can create/list subscriptions
router.route('/')
	.post(authorize('owner', 'manager'), createSubscription)
	.get(authorize('owner', 'manager'), getSubscriptions);

// Logged-in user views their own subscriptions
router.get('/me', authorize('member', 'user', 'trainer', 'manager', 'owner'), getMySubscriptions);

module.exports = router;