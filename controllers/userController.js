const User = require('../models/user'); // Matches your filename
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');
const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../middleware/fileUpload');

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

// @desc    Upload/update my avatar
// @route   POST /api/v1/users/avatar
// @access  Private
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file?.key) {
    return next(new AppError('Please upload an image file', 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const previousKey = user.photoUrl;
  user.photoUrl = req.file.key;
  await user.save();

  // Best-effort cleanup of previous avatar
  if (previousKey && typeof previousKey === 'string' && previousKey.startsWith('avatars/')) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: previousKey
        })
      );
    } catch (e) {
      // Ignore cleanup failure
    }
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: user.photoUrl
  });
  const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  res.status(200).json({
    success: true,
    data: {
      photoKey: user.photoUrl,
      photoUrl: signedUrl
    }
  });
});