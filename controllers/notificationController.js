const asyncHandler = require('../middleware/asyncHandler');

const Notification = require('../models/notification');

// @desc    Get my notifications
// @route   GET /api/v1/notifications
// @access  Private
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const unreadOnly = String(req.query.unread || '').toLowerCase() === 'true';

  const filter = { user: req.user.id };
  if (unreadOnly) filter.readAt = null;

  const notifications = await Notification.find(filter)
    .sort('-createdAt')
    .limit(Math.min(Number(req.query.limit) || 50, 200));

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

// @desc    Mark notifications as read
// @route   PUT /api/v1/notifications/mark-read
// @access  Private
exports.markRead = asyncHandler(async (req, res) => {
  const now = new Date();
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : null;

  let result;
  if (ids && ids.length > 0) {
    result = await Notification.updateMany(
      { _id: { $in: ids }, user: req.user.id, readAt: null },
      { $set: { readAt: now } }
    );
  } else {
    result = await Notification.updateMany(
      { user: req.user.id, readAt: null },
      { $set: { readAt: now } }
    );
  }

  res.status(200).json({
    success: true,
    data: {
      matched: result.matchedCount ?? result.n ?? 0,
      modified: result.modifiedCount ?? result.nModified ?? 0
    }
  });
});
