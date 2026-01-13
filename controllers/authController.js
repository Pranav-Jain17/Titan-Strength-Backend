const User = require('../models/user');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');
const { blacklistToken } = require('../utils/tokenBlacklist');

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeBaseUrl = (url) => (typeof url === 'string' ? url.replace(/\/+$/, '') : url);

const getFrontendBaseUrl = () => {
  const frontendBaseUrl = normalizeBaseUrl(process.env.FRONTEND_URL);
  if (frontendBaseUrl) return frontendBaseUrl;

  if (process.env.NODE_ENV === 'production') {
    throw new AppError('FRONTEND_URL is not configured on the server', 500);
  }

  return 'http://localhost:5173';
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const options = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
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

const getTokenFromRequest = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  return null;
};

exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  if (!email || !password || !name) {
    return next(new AppError('Please provide name, email and password', 400));
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : role;
  if (normalizedRole && normalizedRole !== 'user') {
    return next(new AppError('You cannot register with this role directly.', 403));
  }

  // If the user already exists but is not verified, allow requesting a new
  // verification email *after* the old token expires (24h).
  const existingUser = await User.findOne({
    email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i')
  }).select('+password');

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      return next(new AppError('Email already registered. Please log in.', 409));
    }

    const tokenIsStillValid =
      existingUser.emailVerificationExpire && existingUser.emailVerificationExpire.getTime() > Date.now();

    if (tokenIsStillValid) {
      return next(
        new AppError(
          'Account already exists but is not verified. Please check your email. You can request a new verification email after 24 hours.',
          409
        )
      );
    }

    // Re-issue verification token and (optionally) update the user's info.
    existingUser.name = String(name);
    existingUser.email = normalizedEmail;
    existingUser.password = String(password);
    existingUser.role = 'user';

    const verificationToken = existingUser.getEmailVerificationToken();
    await existingUser.save();

    const verifyUrl = `${getFrontendBaseUrl()}/api/v1/auth/verify-email/${verificationToken}`;
    const message = `
      <h1>Verify your email</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyUrl}" clicktracking=off>${verifyUrl}</a>
      <p>This link is valid for 24 hours.</p>
    `;

    try {
      await sendEmail({
        email: existingUser.email,
        subject: 'Verify your email',
        message
      });
    } catch (err) {
      console.error(err);
      existingUser.emailVerificationToken = undefined;
      existingUser.emailVerificationExpire = undefined;
      await existingUser.save({ validateBeforeSave: false });
      return next(new AppError('Verification email could not be sent', 500));
    }

    return res.status(200).json({
      success: true,
      data: 'Verification email resent. Please check your email to verify your account.'
    });
  }

  const user = await User.create({ name, email: normalizedEmail, password, role: 'user' });

  const verificationToken = user.getEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

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

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) return next(new AppError('Please provide email and password', 400));

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i') }).select('+password');
  
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

exports.logout = asyncHandler(async (req, res) => {
  const token = getTokenFromRequest(req);
  if (token) {
    blacklistToken(token);
  }

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 5 * 1000)
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  res.status(200).cookie('token', 'none', cookieOptions).json({
    success: true,
    data: 'Logged out'
  });
});

exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({ success: true, data: user });
});

exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide an email', 400));
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, 'i') });

  // Always return success to avoid user enumeration.
  if (!user) {
    return res.status(200).json({
      success: true,
      data: 'If that email exists, a reset link has been sent.'
    });
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${getFrontendBaseUrl()}/reset-password?token=${resetToken}`;
  const message = `
    <h1>Password reset</h1>
    <p>You requested a password reset.</p>
    <p>This link is valid for 1 hour:</p>
    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset',
      message
    });

    return res.status(200).json({
      success: true,
      data: 'If that email exists, a reset link has been sent.'
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Email could not be sent', 500));
  }
});

exports.resetPassword = asyncHandler(async (req, res, next) => {
  const resetToken = req.params.token;
  const { newPassword } = req.body;

  if (!newPassword) {
    return next(new AppError('Please provide newPassword', 400));
  }

  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(String(resetToken))
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+password');

  if (!user) {
    return next(new AppError('Invalid or expired reset token', 400));
  }

  user.password = String(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Log the user in after reset
  sendTokenResponse(user, 200, res);
});

exports.updatePassword = asyncHandler(async (req, res, next) => {
  const oldPassword = req.body.oldPassword || req.body.currentPassword;
  const { newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return next(new AppError('Please provide oldPassword and newPassword', 400));
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const isMatch = await user.matchPassword(String(oldPassword));
  if (!isMatch) {
    return next(new AppError('Old password is incorrect', 401));
  }

  user.password = String(newPassword);
  await user.save();

  // Refresh token/cookie after password update
  sendTokenResponse(user, 200, res);
});

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