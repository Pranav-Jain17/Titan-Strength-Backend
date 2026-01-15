const Branch = require('../models/branch');
const User = require('../models/user'); 
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');
const ownerController = require('./ownerController');

// @desc    Get all branches
// @route   GET /api/v1/branches
// @access  Public
exports.getBranches = asyncHandler(async (req, res, next) => {
  // Populate manager name, but hide their sensitive info
  const branches = await Branch.find().populate('manager', 'name email');

  res.status(200).json({
    success: true,
    count: branches.length,
    data: branches
  });
});

// @desc    Get single branch
// @route   GET /api/v1/branches/:id
// @access  Public
exports.getBranch = asyncHandler(async (req, res, next) => {
  const branch = await Branch.findById(req.params.id)
    .populate('manager', 'name email')
    .populate('members', 'name email'); // Show members (Virtual)

  if (!branch) {
    return next(new AppError(`Branch not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: branch });
});

// @desc    Create new branch
// @route   POST /api/v1/branches
// @access  Private (Owner only)
exports.createBranch = asyncHandler(async (req, res, next) => {
  return ownerController.createBranch(req, res, next);
});

// @desc    Update branch
// @route   PUT /api/v1/branches/:id
// @access  Private (Owner or Assigned Manager)
exports.updateBranch = asyncHandler(async (req, res, next) => {
  let branch = await Branch.findById(req.params.id);

  if (!branch) {
    return next(new AppError(`Branch not found with id of ${req.params.id}`, 404));
  }

  // Permission Check: 
  // Allow if user is Owner OR if user is the Manager of THIS branch
  if (req.user.role !== 'owner' && branch.manager?.toString() !== req.user.id) {
    return next(new AppError(`Not authorized to update this branch`, 403));
  }

  // Re-run Manager Verification if manager field is being updated
  if (req.body.manager) {
    const user = await User.findById(req.body.manager);
    if (!user || user.role !== 'manager') {
      return next(new AppError(`Invalid Manager ID or User is not a Manager`, 400));
    }
  }

  branch = await Branch.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: branch });
});

// @desc    Delete branch
// @route   DELETE /api/v1/branches/:id
// @access  Private (Owner only)
exports.deleteBranch = asyncHandler(async (req, res, next) => {
  return ownerController.deleteBranch(req, res, next);
});