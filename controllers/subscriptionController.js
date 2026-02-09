const Subscription = require('../models/subscription');
const Plan = require('../models/plan');
const User = require('../models/user');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Create a Subscription (Manual / Cash)
// @route   POST /api/v1/subscriptions
// @access  Private (Manager/Owner)
exports.createSubscription = asyncHandler(async (req, res, next) => {
  const { planId, email, paymentMethod } = req.body;

  // 1. Find the User by Email
  let user;
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
  } else {
    return next(new AppError('Please provide an Email', 400));
  }

  if (!user) {
    return next(new AppError('User not found. Please register them first.', 404));
  }

  // 2. Validate Plan
  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  // 3. Check if they already have an active subscription
  const existingSub = await Subscription.findOne({ 
    user: user._id, 
    status: 'active' 
  });
  
  if (existingSub) {
    return next(new AppError('User already has an active subscription', 400));
  }

  // 4. Calculate Expiration Date
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // 5. Create the Subscription
  const subscription = await Subscription.create({
    user: user._id,
    plan: planId,
    startDate: Date.now(),
    endDate,
    status: 'active',
    paymentMethod: paymentMethod || 'manual'
  });

  // 6. Upgrade User Role
  user.role = 'member';
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    success: true,
    data: subscription,
    message: `Subscription created for ${user.name}`
  });
});

// @desc    Get All Subscriptions (with optional Email filter)
// @route   GET /api/v1/subscriptions?email=user@example.com
// @access  Private (Manager/Owner)
exports.getSubscriptions = asyncHandler(async (req, res, next) => {
  let query = {};

  // If 'email' is in the URL (e.g. ?email=john@gmail.com), find that user's ID first
  if (req.query.email) {
    const user = await User.findOne({ email: req.query.email.toLowerCase() });
    if (!user) {
      // If user doesn't exist, return empty list (no subscriptions)
      return res.status(200).json({ success: true, count: 0, data: [] }); 
    }
    query.user = user._id;
  }

  const subs = await Subscription.find(query)
    .populate('user', 'name email')
    .populate('plan', 'name price')
    .sort('-startDate'); // Newest first

  res.status(200).json({
    success: true,
    count: subs.length,
    data: subs
  });
});

// @desc    Get My Subscriptions (Logged in user)
// @route   GET /api/v1/subscriptions/me
// @access  Private (Member)
exports.getMySubscriptions = asyncHandler(async (req, res, next) => {
  const subs = await Subscription.find({ user: req.user.id })
    .populate('plan', 'name features durationDays')
    .sort('-startDate');

  res.status(200).json({
    success: true,
    count: subs.length,
    data: subs
  });
});