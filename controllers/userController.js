const User = require('../models/user'); // Matches your filename
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

// @desc    Get all users (with search capabilities)
// @route   GET /api/v1/users
// @access  Private (Owner/Manager)
exports.getUsers = asyncHandler(async (req, res, next) => {
  // This allows searching like: ?email=john@gmail.com
  const users = await User.find(req.query);

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user by ID
// @route   GET /api/v1/users/:id
// @access  Private (Owner/Manager)
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});