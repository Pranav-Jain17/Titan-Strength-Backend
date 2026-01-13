const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const AppError = require('../utils/appError');
const User = require('../models/user');
const { isBlacklisted } = require('../utils/tokenBlacklist');

// Protect routes (Check if user is logged in)
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; // Bearer <token>
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) return next(new AppError('Not authorized to access this route', 401));

  if (isBlacklisted(token)) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (err) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`User role ${req.user.role} is not authorized`, 403));
    }
    next();
  };
};
