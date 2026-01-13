const Plan = require('../models/plan')
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Get all active plans
// @route   GET /api/v1/plans
// @access  Public
exports.getPlans = asyncHandler(async (req, res, next) => {
  const plans = await Plan.find({ active: true });

  res.status(200).json({
    success: true,
    count: plans.length,
    data: plans
  });
});

// @desc    Get single plan
// @route   GET /api/v1/plans/:id
// @access  Public
exports.getPlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.findById(req.params.id);

  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  res.status(200).json({ success: true, data: plan });
});

// @desc    Create a plan
// @route   POST /api/v1/plans
// @access  Private (Owner Only)
exports.createPlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.create(req.body);

  res.status(201).json({
    success: true,
    data: plan
  });
});

// @desc    Update plan
// @route   PUT /api/v1/plans/:id
// @access  Private (Owner Only)
exports.updatePlan = asyncHandler(async (req, res, next) => {
  let plan = await Plan.findById(req.params.id);

  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: plan });
});

// @desc    Delete plan (Soft delete)
// @route   DELETE /api/v1/plans/:id
// @access  Private (Owner Only)
exports.deletePlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.findById(req.params.id);
  
  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  // Instead of deleting from DB, we mark it inactive
  plan.active = false;
  await plan.save();

  res.status(200).json({ success: true, data: {} });
});