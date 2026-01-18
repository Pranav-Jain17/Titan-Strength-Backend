const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const Video = require('../models/video');
const Diet = require('../models/diet');
const DietAssignment = require('../models/dietAssignment');
const WorkoutAssignment = require('../models/workoutAssignment');

// @desc    Get workout videos
// @route   GET /api/v1/content/videos
// @access  Private (Member)
exports.getVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ active: true }).sort('-createdAt').limit(200);

  res.status(200).json({
    success: true,
    count: videos.length,
    data: videos
  });
});

// @desc    Create/upload a workout video (content library)
// @route   POST /api/v1/content/videos
// @access  Private (Trainer)
exports.createVideo = asyncHandler(async (req, res, next) => {
  const { title, url, thumbnailUrl, description, tags, active } = req.body;

  if (!title || !url) {
    return next(new AppError('Please provide title and url', 400));
  }

  const video = await Video.create({
    title: String(title).trim(),
    url: String(url).trim(),
    thumbnailUrl: thumbnailUrl ? String(thumbnailUrl).trim() : '',
    description: description ? String(description) : '',
    tags: Array.isArray(tags) ? tags.map((t) => String(t)) : [],
    active: active === undefined ? true : Boolean(active)
  });

  res.status(201).json({
    success: true,
    data: video
  });
});

// @desc    Get available diet plans
// @route   GET /api/v1/content/diets
// @access  Private (Member)
exports.getDiets = asyncHandler(async (req, res) => {
  const diets = await Diet.find({ active: true }).sort('name');

  res.status(200).json({
    success: true,
    count: diets.length,
    data: diets
  });
});

// @desc    Get my assigned diet plan (diet or custom)
// @route   GET /api/v1/content/diets/my-plan
// @access  Private (Member)
exports.getMyDietPlan = asyncHandler(async (req, res) => {
  const assignment = await DietAssignment.findOne({
    user: req.user.id,
    active: true
  })
    .sort('-createdAt')
    .populate('diet');

  if (!assignment) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  const diet = assignment.diet;

  res.status(200).json({
    success: true,
    data: {
      assignmentId: String(assignment._id),
      dietId: diet ? String(diet._id) : null,
      name: diet?.name || null,
      description: diet?.description || '',
      goalType: diet?.goalType || null,
      plan: assignment.customPlan ?? diet?.plan ?? null,
      notes: assignment.notes || ''
    }
  });
});

// @desc    Get my assigned workout plan (video or custom)
// @route   GET /api/v1/content/workouts/my-plan
// @access  Private (Member)
exports.getMyWorkoutPlan = asyncHandler(async (req, res) => {
  const assignment = await WorkoutAssignment.findOne({
    user: req.user.id,
    active: true
  })
    .sort('-createdAt')
    .populate('video');

  if (!assignment) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }

  const video = assignment.video;

  res.status(200).json({
    success: true,
    data: {
      assignmentId: String(assignment._id),
      videoId: video ? String(video._id) : null,
      title: video?.title || null,
      url: video?.url || null,
      thumbnailUrl: video?.thumbnailUrl || '',
      description: video?.description || '',
      tags: video?.tags || [],
      customPlan: assignment.customPlan ?? null,
      notes: assignment.notes || ''
    }
  });
});
