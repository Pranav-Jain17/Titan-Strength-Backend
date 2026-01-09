const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

// get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true // prevents client-side JS from accessing the cookie
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode).cookie('token', token, options).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
};

// @route   POST /api/v1/auth/register
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;
  if (normalizedRole && normalizedRole !== 'user') {
    return next(new AppError('You cannot register with this role directly.', 403));
  }

  const user = await User.create({ name, email, password, role: 'user' });

  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  // to change this with frontend url when it will be made
  const verifyUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${verificationToken}`;

  const message = `
    <h1>Verify your email</h1>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
    <p>This link is valid for 24 hours.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Verify your email',
      message
    });
  } catch (err) {
    console.error(err);
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('Verification email could not be sent', 500));
  }

  res.status(201).json({
  success: true,
  data: 'User registered. Please check your email to verify your account.'
});
});

// @route   POST /api/v1/auth/login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const user = await User.findOne({ email }).select('+password');
  
  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid credentials', 401));
  }
  if (!user.isEmailVerified) {
  return next(new AppError('Please verify your email before logging in.', 401));
}
  if (user.status !== 'active') {
    return next(new AppError('Your account is suspended. Contact support.', 403));
  }

  sendTokenResponse(user, 200, res);
});
// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
});

// @route   POST /api/v1/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email', 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }

  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // change this with frontend url when it will be made
  const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

  const message = `
    <h1>You have requested a password reset</h1>
    <p>Please click the link below to reset your password:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>This link is valid for 1 hour.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Request',
      message
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Email could not be sent', 500));
  }
});

// @route   PUT /api/v1/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res, next) => {
  if (!req.body.password) {
    return next(new AppError('Please provide a new password', 400));
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    return next(new AppError('Invalid token or token has expired', 400));
  }

  user.password = req.body.password;

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  sendTokenResponse(user, 200, res);
});

// @route   GET /api/v1/auth/verify-email/:token
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Invalid or expired verification token', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, data: 'Email Verified Successfully' });
});