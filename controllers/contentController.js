const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const Video = require('../models/video');
const Diet = require('../models/diet');
const DietAssignment = require('../models/dietAssignment');
const WorkoutAssignment = require('../models/workoutAssignment');
const { cloudinary } = require('../middleware/fileUpload'); 

const normalizeTags = (tags) => {
  if (tags === undefined) return undefined;
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return undefined;
};

// @desc    Get workout videos
// @route   GET /api/v1/content/videos
// @access  Private (Member,Trainer)
exports.getVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ active: true }).sort('-createdAt');

  // Generate dynamic URLs for each video
  const videoList = await Promise.all(videos.map(async (video) => {
    // If it's a YouTube link or already a full URL, return as is
    if (video.url.startsWith('http')) {
      return video;
    }

    // If it's a Cloudinary public_id, generate a dynamic URL
    const dynamicUrl = cloudinary.url(video.url, { resource_type: 'video', secure: true });

    // Return the video object with the temporary URL swapped in
    return {
      ...video.toObject(),
      url: dynamicUrl
    };
  }));

  res.status(200).json({
    success: true,
    count: videoList.length,
    data: videoList
  });
});
// @desc    Create/upload a workout video (content library)
// @route   POST /api/v1/content/videos
// @access  Private (Trainer)
exports.createVideo = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a video file', 400));
  }

  const { title, description, tags, active } = req.body;

  const video = await Video.create({
    title: title,
    // We save ONLY the public_id (filename), NOT the full URL
    url: req.file.filename, 
    description: description,
    tags: normalizeTags(tags) ?? [],
    active: active
  });

  res.status(201).json({
    success: true,
    data: video
  });
});

// @desc    Update a workout video (metadata and/or replace file)
// @route   PUT /api/v1/content/videos/:id
// @access  Private (Trainer)
exports.updateVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    return next(new AppError('Video not found', 404));
  }

  const { title, description, tags, active } = req.body;

  if (title !== undefined) video.title = title;
  if (description !== undefined) video.description = description;

  const normalizedTags = normalizeTags(tags);
  if (normalizedTags !== undefined) video.tags = normalizedTags;

  if (active !== undefined) {
    if (typeof active === 'boolean') video.active = active;
    if (typeof active === 'string') video.active = active.toLowerCase() === 'true';
  }

  // Optional: replace the underlying video file
  if (req.file?.filename) {
    const oldKey = video.url;
    video.url = req.file.filename;

    // Best-effort cleanup of the old Cloudinary object
    if (oldKey && typeof oldKey === 'string' && !oldKey.startsWith('http')) {
      try {
        await cloudinary.uploader.destroy(oldKey, { resource_type: 'video' });
      } catch (e) {
        // Ignore deletion failure
      }
    }
  }

  await video.save();

  res.status(200).json({
    success: true,
    data: video
  });
});

// @desc    Delete a workout video
// @route   DELETE /api/v1/content/videos/:id
// @access  Private (Trainer)
exports.deleteVideo = asyncHandler(async (req, res, next) => {
  const video = await Video.findById(req.params.id);
  if (!video) {
    return next(new AppError('Video not found', 404));
  }

  const key = video.url;

  await video.deleteOne();

  // Best-effort cleanup of Cloudinary object
  if (key && typeof key === 'string' && !key.startsWith('http')) {
    try {
      await cloudinary.uploader.destroy(key, { resource_type: 'video' });
    } catch (e) {
      // Ignore cleanup failure
    }
  }

  res.status(200).json({
    success: true,
    data: {}
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
