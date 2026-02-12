const asyncHandler = require('../middleware/asyncHandler');

const Notification = require('../models/notification');

// @desc    Get my notifications
// @route   GET /api/v1/notifications
// @access  Private
exports.getMyNotifications = asyncHandler(async (req, res) => {
  const unreadOnly = String(req.query.unread || '').toLowerCase() === 'true';

  const filter = {
    $or: [{ recipient: req.user.id }, { user: req.user.id }]
  };
  if (unreadOnly) {
    filter.$and = [{ $or: [{ isRead: false }, { readAt: null }] }];
  }

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
      {
        _id: { $in: ids },
        $or: [{ recipient: req.user.id }, { user: req.user.id }],
        $or: [{ isRead: false }, { readAt: null }]
      },
      { $set: { isRead: true, readAt: now } }
    );
  } else {
    result = await Notification.updateMany(
      {
        $or: [{ recipient: req.user.id }, { user: req.user.id }],
        $or: [{ isRead: false }, { readAt: null }]
      },
      { $set: { isRead: true, readAt: now } }
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
