const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const Attendance = require('../models/attendance');
const { findActiveSubscriptionForUser } = require('../utils/subscriptionUtils');
const notify = require('../utils/notify');

// @desc    Self check-in (member)
// @route   POST /api/v1/attendance/check-in
// @access  Private (Member)
exports.checkIn = asyncHandler(async (req, res, next) => {
  const activeSub = await findActiveSubscriptionForUser(req.user.id);
  if (!activeSub) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: No active subscription'
    });
  }

  const alreadyInside = await Attendance.findOne({
    user: req.user.id,
    checkedOutAt: null
  }).sort('-checkedInAt');

  if (alreadyInside) {
    return res.status(200).json({
      success: true,
      message: 'Already checked in',
      data: alreadyInside
    });
  }

  const note = req.body?.note ? String(req.body.note) : '';

  const attendance = await Attendance.create({
    user: req.user.id,
    checkedInAt: new Date(),
    checkedOutAt: null,
    note,
    createdBy: req.user.id
  });

  await notify({
    userId: req.user.id,
    title: 'Check-in Confirmed',
    message: `Welcome back! You checked in at ${new Date().toLocaleTimeString()}`,
    type: 'success',
    sendMail: false
  });

  res.status(201).json({
    success: true,
    message: 'Checked in successfully',
    data: {
      attendance,
      subscription: {
        planName: activeSub.plan?.name,
        expiresOn: activeSub.endDate
      }
    }
  });
});
