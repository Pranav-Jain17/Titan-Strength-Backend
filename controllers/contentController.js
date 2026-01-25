const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const Video = require('../models/video');
const Diet = require('../models/diet');
const DietAssignment = require('../models/dietAssignment');
const WorkoutAssignment = require('../models/workoutAssignment');
const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../middleware/fileUpload'); 

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
// @access  Private (Member)
exports.getVideos = asyncHandler(async (req, res) => {
  const videos = await Video.find({ active: true }).sort('-createdAt');

  // Generate temporary URLs for each video
  const videoList = await Promise.all(videos.map(async (video) => {
    // If it's a YouTube link, return as is
    if (video.url.startsWith('http')) {
      return video;
    }

    // If it's an S3 key, generate a signed URL
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: video.url,
    });

    // Create a URL valid for 1 hour (3600 seconds)
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    // Return the video object with the temporary URL swapped in
    return {
      ...video.toObject(),
      url: signedUrl
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
    // We save ONLY the key (e.g., "videos/12345.mp4"), NOT the full URL
    url: req.file.key, 
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
  if (req.file?.key) {
    const oldKey = video.url;
    video.url = req.file.key;

    // Best-effort cleanup of the old S3 object (only when we store a key)
    if (oldKey && typeof oldKey === 'string' && !oldKey.startsWith('http')) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: oldKey
          })
        );
      } catch (e) {
        // Ignore S3 deletion failure to avoid blocking updates
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

  // Best-effort cleanup of S3 object
  if (key && typeof key === 'string' && !key.startsWith('http')) {
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key
        })
      );
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
