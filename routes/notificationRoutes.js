const express = require('express');
const { protect } = require('../middleware/auth');

const { getMyNotifications, markRead } = require('../controllers/notificationController');

const router = express.Router();

router.use(protect);

router.get('/', getMyNotifications); // URL: /api/v1/notifications
router.put('/mark-read', markRead); // URL: /api/v1/notifications/mark-read

module.exports = router;
