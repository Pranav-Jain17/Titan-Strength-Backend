const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const User = require('../models/user');
const TrainerAssignment = require('../models/trainerAssignment');
const ClassSession = require('../models/classSession');
const ClassAttendance = require('../models/classAttendance');
const ProgressLog = require('../models/progressLog');
const Diet = require('../models/diet');
const DietAssignment = require('../models/dietAssignment');
const Video = require('../models/video');
const WorkoutAssignment = require('../models/workoutAssignment');

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const requireAssignedClient = async (trainerId, userId) => {
  const assignment = await TrainerAssignment.findOne({
    trainer: trainerId,
    member: userId,
    active: true
  });

  if (!assignment) {
    throw new AppError('Client is not assigned to this trainer', 403);
  }

  return assignment;
};

// @desc    Trainer dashboard overview
// @route   GET /api/v1/trainers/dashboard
// @access  Private (Trainer)
exports.getTrainerDashboard = asyncHandler(async (req, res) => {
  const activeClients = await TrainerAssignment.countDocuments({
    trainer: req.user.id,
    active: true
  });

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const upcomingClasses = await ClassSession.find({
    trainer: req.user.id,
    status: 'scheduled',
    startTime: { $gte: todayStart, $lte: todayEnd }
  })
    .sort('startTime')
    .select('title description startTime endTime capacity status');

  const days = Number(req.query.days || 14);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (Number.isFinite(days) && days > 0 ? days : 14));

  const assignments = await TrainerAssignment.find({
    trainer: req.user.id,
    active: true
  }).select('member');

  const memberIds = assignments.map((a) => a.member);

  let pendingReviews = 0;
  if (memberIds.length > 0) {
    const latestByUser = await ProgressLog.aggregate([
      {
        $match: {
          trainer: req.user._id,
          user: { $in: memberIds }
        }
      },
      {
        $group: {
          _id: '$user',
          lastDate: { $max: '$date' }
        }
      }
    ]);

    const upToDate = new Set(
      latestByUser
        .filter((x) => x.lastDate && new Date(x.lastDate).getTime() >= cutoff.getTime())
        .map((x) => String(x._id))
    );

    pendingReviews = memberIds.filter((id) => !upToDate.has(String(id))).length;
  }

  res.status(200).json({
    success: true,
    data: {
      activeClients,
      upcomingClasses,
      pendingReviews
    }
  });
});

// @desc    Get trainer teaching schedule
// @route   GET /api/v1/trainers/schedule
// @access  Private (Trainer)
exports.getTrainerSchedule = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : startOfDay(new Date());
  const to = req.query.to ? new Date(req.query.to) : (() => {
    const x = new Date(from);
    x.setDate(x.getDate() + 30);
    return endOfDay(x);
  })();

  const sessions = await ClassSession.find({
    trainer: req.user.id,
    status: 'scheduled',
    startTime: { $gte: from, $lte: to }
  })
    .sort('startTime')
    .select('title description startTime endTime capacity status');

  res.status(200).json({
    success: true,
    count: sessions.length,
    data: sessions
  });
});

// @desc    Get attendees for a trainer's class
// @route   GET /api/v1/trainers/schedule/:classId/attendees
// @access  Private (Trainer)
exports.getTrainerClassAttendees = asyncHandler(async (req, res, next) => {
  const session = await ClassSession.findById(req.params.classId);
  if (!session) return next(new AppError('Class not found', 404));

  if (!session.trainer || String(session.trainer) !== String(req.user.id)) {
    return next(new AppError('Not authorized to view attendees for this class', 403));
  }

  const attendance = await ClassAttendance.find({ classSession: session._id })
    .populate('user', 'name email role status')
    .sort('createdAt');

  res.status(200).json({
    success: true,
    class: session,
    count: attendance.length,
    data: attendance
  });
});

// @desc    Get trainer client roster
// @route   GET /api/v1/trainers/clients
// @access  Private (Trainer)
exports.getTrainerClients = asyncHandler(async (req, res) => {
  const assignments = await TrainerAssignment.find({
    trainer: req.user.id,
    active: true
  })
    .populate('member', 'name email goal currentWeight photoUrl status homeBranch')
    .sort('-createdAt');

  const clients = assignments
    .filter((a) => a.member)
    .map((a) => ({
      assignmentId: String(a._id),
      notes: a.notes || '',
      active: a.active,
      member: a.member
    }));

  res.status(200).json({
    success: true,
    count: clients.length,
    data: clients
  });
});

// @desc    Get a specific client profile
// @route   GET /api/v1/trainers/clients/:userId
// @access  Private (Trainer)
exports.getTrainerClientProfile = asyncHandler(async (req, res) => {
  await requireAssignedClient(req.user.id, req.params.userId);

  const user = await User.findById(req.params.userId)
    .select('name email goal currentWeight photoUrl status homeBranch createdAt')
    .populate('homeBranch', 'name phone email address');

  if (!user) {
    throw new AppError('Client not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Add a client progress check-in
// @route   POST /api/v1/trainers/clients/:userId/progress
// @access  Private (Trainer)
exports.createClientProgress = asyncHandler(async (req, res) => {
  await requireAssignedClient(req.user.id, req.params.userId);

  const { date, weight, bodyFatPercent, bicepSize, notes } = req.body;

  const record = await ProgressLog.create({
    user: req.params.userId,
    trainer: req.user.id,
    date: date ? new Date(date) : new Date(),
    weight: weight !== undefined ? weight : null,
    bodyFatPercent: bodyFatPercent !== undefined ? bodyFatPercent : null,
    bicepSize: bicepSize !== undefined ? bicepSize : null,
    notes: notes || ''
  });

  res.status(201).json({
    success: true,
    data: record
  });
});

// @desc    Get a client's progress history
// @route   GET /api/v1/trainers/clients/:userId/progress
// @access  Private (Trainer)
exports.getClientProgress = asyncHandler(async (req, res) => {
  await requireAssignedClient(req.user.id, req.params.userId);

  const logs = await ProgressLog.find({
    user: req.params.userId,
    trainer: req.user.id
  })
    .sort('-date')
    .limit(200);

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs
  });
});

// @desc    Assign diet plan to a client
// @route   POST /api/v1/trainers/clients/:userId/assign-diet
// @access  Private (Trainer)
exports.assignDietToClient = asyncHandler(async (req, res, next) => {
  await requireAssignedClient(req.user.id, req.params.userId);

  const { dietId, customPlan, notes } = req.body;

  if (!dietId && !customPlan) {
    return next(new AppError('Please provide dietId or customPlan', 400));
  }

  let diet = null;
  if (dietId) {
    diet = await Diet.findById(dietId);
    if (!diet) return next(new AppError('Diet plan not found', 404));
  }

  await DietAssignment.updateMany({ user: req.params.userId, active: true }, { active: false });

  const assignment = await DietAssignment.create({
    user: req.params.userId,
    diet: diet ? diet._id : null,
    customPlan: customPlan ?? null,
    notes: notes || '',
    active: true,
    assignedBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: assignment
  });
});

// @desc    Assign workout content to a client
// @route   POST /api/v1/trainers/clients/:userId/assign-workout
// @access  Private (Trainer)
exports.assignWorkoutToClient = asyncHandler(async (req, res, next) => {
  await requireAssignedClient(req.user.id, req.params.userId);

  const { videoId, customPlan, notes } = req.body;

  if (!videoId && !customPlan) {
    return next(new AppError('Please provide videoId or customPlan', 400));
  }

  let video = null;
  if (videoId) {
    video = await Video.findById(videoId);
    if (!video) return next(new AppError('Video not found', 404));
  }

  await WorkoutAssignment.updateMany({ user: req.params.userId, active: true }, { active: false });

  const assignment = await WorkoutAssignment.create({
    user: req.params.userId,
    video: video ? video._id : null,
    customPlan: customPlan ?? null,
    notes: notes || '',
    active: true,
    assignedBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: assignment
  });
});
