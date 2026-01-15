const asyncHandler = require('../middleware/asyncHandler');

const Video = require('../models/video');
const Diet = require('../models/diet');
const DietAssignment = require('../models/dietAssignment');

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
