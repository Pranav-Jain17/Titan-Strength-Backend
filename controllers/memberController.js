const asyncHandler = require('../middleware/asyncHandler');

const User = require('../models/user');
const Subscription = require('../models/subscription');
const Attendance = require('../models/attendance');
const ClassAttendance = require('../models/classAttendance');

// @desc    Member home profile
// @route   GET /api/v1/members/me
// @access  Private (Logged in)
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      userId: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl || '',
      goal: user.goal || '',
      currentWeight: user.currentWeight ?? null,
      homeBranch: user.homeBranch || null,
      createdAt: user.createdAt
    }
  });
});

// @desc    Member subscription status
// @route   GET /api/v1/members/subscription
// @access  Private (Logged in)
exports.getMySubscription = asyncHandler(async (req, res, next) => {
  const now = new Date();

  const sub = await Subscription.findOne({ user: req.user.id })
    .sort('-createdAt')
    .populate('plan', 'name price durationDays');

  if (!sub) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  const isActive = sub.status === 'active' && sub.endDate && sub.endDate >= now;

  res.status(200).json({
    success: true,
    data: {
      planName: sub.plan?.name || null,
      startDate: sub.startDate,
      endDate: sub.endDate,
      status: isActive ? 'active' : 'expired'
    }
  });
});

// @desc    Member stats (attendance count this month)
// @route   GET /api/v1/members/stats
// @access  Private (Logged in)
exports.getMyStats = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const attendanceCount = await Attendance.countDocuments({
    user: req.user.id,
    checkedInAt: { $gte: startOfMonth }
  });

  res.status(200).json({
    success: true,
    data: {
      attendanceThisMonth: attendanceCount
    }
  });
});

// @desc    Member attendance history
// @route   GET /api/v1/members/attendance
// @access  Private (Logged in)
exports.getMyAttendance = asyncHandler(async (req, res, next) => {
  const history = await Attendance.find({ user: req.user.id })
    .sort('-checkedInAt')
    .limit(365);

  res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
});

// @desc    Member payment history (subscriptions as invoices)
// @route   GET /api/v1/members/payment-history
// @access  Private (Logged in)
exports.getMyPaymentHistory = asyncHandler(async (req, res, next) => {
  const subs = await Subscription.find({ user: req.user.id })
    .sort('-createdAt')
    .populate('plan', 'name price durationDays')
    .select('startDate endDate status paymentMethod createdAt');

  const data = subs.map((s) => ({
    date: s.createdAt,
    amount: s.plan?.price || 0,
    planName: s.plan?.name || null,
    paymentMethod: s.paymentMethod,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate
  }));

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
});

// @desc    Member upcoming class bookings
// @route   GET /api/v1/members/my-bookings
// @access  Private (Logged in)
exports.getMyBookings = asyncHandler(async (req, res, next) => {
  const now = new Date();

  const bookings = await ClassAttendance.find({
    user: req.user.id,
    status: { $in: ['booked', 'present'] }
  })
    .populate({
      path: 'classSession',
      select: 'title startTime endTime status capacity trainer',
      populate: { path: 'trainer', select: 'name email' }
    })
    .sort('-createdAt');

  const upcoming = bookings.filter((b) => {
    const session = b.classSession;
    if (!session) return false;
    if (session.status !== 'scheduled') return false;
    if (!session.startTime) return false;
    return session.startTime >= now;
  });

  res.status(200).json({
    success: true,
    count: upcoming.length,
    data: upcoming
  });
});
