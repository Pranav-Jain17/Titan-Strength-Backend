const User = require('../models/user'); 
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');
const { cloudinary } = require('../middleware/fileUpload');

const toCloudinaryUrlIfNeeded = (keyOrUrl) => {
  if (!keyOrUrl || typeof keyOrUrl !== 'string') return '';
  if (keyOrUrl.startsWith('http')) return keyOrUrl;

  return cloudinary.url(keyOrUrl, { secure: true });
};

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

// @desc    Get my avatar (dynamic URL)
// @route   GET /api/v1/users/avatar
// @access  Private
exports.getMyAvatar = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('photoUrl');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (!user.photoUrl) {
    return res.status(200).json({
      success: true,
      data: {
        photoKey: '',
        photoUrl: ''
      }
    });
  }

  const dynamicUrl = toCloudinaryUrlIfNeeded(user.photoUrl);

  res.status(200).json({
    success: true,
    data: {
      photoKey: user.photoUrl,
      photoUrl: dynamicUrl
    }
  });
});

// @desc    Upload/update my avatar
// @route   PUT /api/v1/users/avatar
// @access  Private
exports.uploadAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file?.filename) {
    return next(new AppError('Please upload an image file', 400));
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const previousKey = user.photoUrl;
  user.photoUrl = req.file.filename;
  await user.save();

  // Best-effort cleanup of previous avatar
  if (previousKey && typeof previousKey === 'string' && !previousKey.startsWith('http')) {
    try {
      await cloudinary.uploader.destroy(previousKey);
    } catch (e) {
      // Ignore cleanup failure
    }
  }

  const dynamicUrl = toCloudinaryUrlIfNeeded(user.photoUrl);

  res.status(200).json({
    success: true,
    data: {
      photoKey: user.photoUrl,
      photoUrl: dynamicUrl
    }
  });
});

// @desc    Delete my avatar
// @route   DELETE /api/v1/users/avatar
// @access  Private
exports.deleteMyAvatar = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('photoUrl');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const previousKey = user.photoUrl;
  user.photoUrl = '';
  await user.save();

  if (previousKey && typeof previousKey === 'string' && !previousKey.startsWith('http')) {
    try {
      await cloudinary.uploader.destroy(previousKey);
    } catch (e) {
      // Ignore cleanup failure
    }
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});