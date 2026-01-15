const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const User = require('../models/user');
const Subscription = require('../models/subscription');
const Plan = require('../models/plan');
const Branch = require('../models/branch');

const Attendance = require('../models/attendance');
const Equipment = require('../models/equipment');
const Maintenance = require('../models/maintenance');
const TrainerAssignment = require('../models/trainerAssignment');

const { findActiveSubscriptionForUser } = require('../utils/subscriptionUtils');

// 1) DAILY OPERATIONS

// @desc    Check-in a user into the gym
// @route   POST /api/v1/manager/check-in
// @access  Private (Manager/Owner)
exports.checkIn = asyncHandler(async (req, res, next) => {
  const { userId, note } = req.body;

  if (!userId) {
    return next(new AppError('Please provide userId', 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const activeSub = await findActiveSubscriptionForUser(user._id);
  if (!activeSub) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: No active subscription'
    });
  }

  const alreadyInside = await Attendance.findOne({
    user: user._id,
    checkedOutAt: null
  });

  if (alreadyInside) {
    return res.status(200).json({
      success: true,
      message: 'User already checked in',
      data: alreadyInside
    });
  }

  const attendance = await Attendance.create({
    user: user._id,
    checkedInAt: new Date(),
    checkedOutAt: null,
    note: note || '',
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    message: `Checked in: ${user.email}`,
    data: {
      attendance,
      subscription: {
        planName: activeSub.plan?.name,
        expiresOn: activeSub.endDate
      }
    }
  });
});

// @desc    Live attendance list (who is currently in the gym)
// @route   GET /api/v1/manager/attendance/live
// @access  Private (Manager/Owner)
exports.getLiveAttendance = asyncHandler(async (req, res, next) => {
  const live = await Attendance.find({ checkedOutAt: null })
    .sort('-checkedInAt')
    .populate('user', 'name email role');

  res.status(200).json({
    success: true,
    count: live.length,
    data: live
  });
});

// @desc    List members with status Active/Expired
// @route   GET /api/v1/manager/members?status=active|expired
// @access  Private (Manager/Owner)
exports.getMembers = asyncHandler(async (req, res, next) => {
  const statusFilter = (req.query.status || '').toLowerCase();

  // Consider any user with role=member as "member" (matches your existing logic)
  const members = await User.find({ role: 'member' }).select('name email role createdAt');

  // Fetch latest subscription info for each member
  const memberIds = members.map((m) => m._id);
  const subs = await Subscription.find({ user: { $in: memberIds } })
    .sort('-createdAt')
    .select('user status endDate plan');

  const latestByUser = new Map();
  for (const s of subs) {
    const key = String(s.user);
    if (!latestByUser.has(key)) latestByUser.set(key, s);
  }

  const now = Date.now();
  const data = members
    .map((m) => {
      const sub = latestByUser.get(String(m._id));
      const isActive = !!sub && sub.status === 'active' && sub.endDate && new Date(sub.endDate).getTime() >= now;
      return {
        _id: m._id,
        userId: String(m._id),
        name: m.name,
        email: m.email,
        role: m.role,
        status: isActive ? 'active' : 'expired',
        expiresOn: sub?.endDate || null
      };
    })
    .filter((row) => {
      if (!statusFilter) return true;
      return row.status === statusFilter;
    });

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
});

// @desc    Get a member profile (details + attendance history)
// @route   GET /api/v1/manager/members/:id
// @access  Private (Manager/Owner)
exports.getMemberProfile = asyncHandler(async (req, res, next) => {
  const member = await User.findById(req.params.id);
  if (!member) return next(new AppError('User not found', 404));

  const subscriptions = await Subscription.find({ user: member._id })
    .sort('-createdAt')
    .populate('plan', 'name price durationDays');

  const attendanceHistory = await Attendance.find({ user: member._id })
    .sort('-checkedInAt')
    .limit(100);

  res.status(200).json({
    success: true,
    data: {
      member,
      subscriptions,
      attendanceHistory
    }
  });
});

// 3) EQUIPMENT & FACILITY

// @desc    Add new equipment
// @route   POST /api/v1/manager/equipment
// @access  Private (Manager/Owner)
exports.addEquipment = asyncHandler(async (req, res, next) => {
  const { name, tag } = req.body;
  if (!name) return next(new AppError('Please provide equipment name', 400));

  const equipment = await Equipment.create({
    name,
    tag: tag || '',
    createdBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: equipment
  });
});

// @desc    List equipment
// @route   GET /api/v1/manager/equipment?status=working|out_of_order|maintenance
// @access  Private (Manager/Owner)
exports.getEquipment = asyncHandler(async (req, res, next) => {
  const status = (req.query.status || '').toLowerCase();
  const allowed = ['working', 'out_of_order', 'maintenance'];

  const filter = {};
  if (status) {
    if (!allowed.includes(status)) {
      return next(new AppError(`Invalid status. Use: ${allowed.join(', ')}`, 400));
    }
    filter.status = status;
  }

  const equipment = await Equipment.find(filter)
    .sort('name')
    .populate('createdBy', 'name email role');

  res.status(200).json({
    success: true,
    count: equipment.length,
    data: equipment
  });
});

// @desc    Report a maintenance issue
// @route   POST /api/v1/manager/maintenance/report
// @access  Private (Manager/Owner)
exports.reportMaintenance = asyncHandler(async (req, res, next) => {
  const { equipmentId, description } = req.body;
  if (!description) return next(new AppError('Please provide description', 400));

  const maintenance = await Maintenance.create({
    equipment: equipmentId || null,
    description,
    status: 'pending',
    reportedBy: req.user.id
  });

  if (equipmentId) {
    await Equipment.findByIdAndUpdate(equipmentId, { status: 'maintenance' });
  }

  res.status(201).json({
    success: true,
    data: maintenance
  });
});

// @desc    Update maintenance status
// @route   PUT /api/v1/manager/maintenance/:id/status
// @access  Private (Manager/Owner)
exports.updateMaintenanceStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  const allowed = ['pending', 'in_progress', 'fixed'];
  if (!allowed.includes(status)) {
    return next(new AppError(`Invalid status. Use: ${allowed.join(', ')}`, 400));
  }

  const maintenance = await Maintenance.findById(req.params.id);
  if (!maintenance) return next(new AppError('Maintenance record not found', 404));

  maintenance.status = status;
  maintenance.updatedBy = req.user.id;
  await maintenance.save();

  // If fixed, mark equipment working again
  if (maintenance.equipment && status === 'fixed') {
    await Equipment.findByIdAndUpdate(maintenance.equipment, { status: 'working' });
  }

  res.status(200).json({
    success: true,
    data: maintenance
  });
});

// 4) TRAINER OVERSIGHT

// @desc    List all trainers
// @route   GET /api/v1/manager/trainers
// @access  Private (Manager/Owner)
exports.getTrainers = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'manager') {
    const branch = await Branch.findOne({ manager: req.user.id });
    if (!branch) {
      return next(new AppError('You are not assigned to a branch yet.', 400));
    }

    const trainers = await User.find({ role: 'trainer', homeBranch: branch._id }).select('name email role homeBranch');
    return res.status(200).json({
      success: true,
      count: trainers.length,
      data: trainers
    });
  }

  const trainers = await User.find({ role: 'trainer' }).select('name email role homeBranch');

  res.status(200).json({
    success: true,
    count: trainers.length,
    data: trainers
  });
});

// @desc    Assign trainer to a member
// @route   POST /api/v1/manager/trainers/assign-client
// @access  Private (Manager/Owner)
exports.assignTrainerToMember = asyncHandler(async (req, res, next) => {
  const { trainerId, memberId, notes } = req.body;

  if (!trainerId || !memberId) {
    return next(new AppError('Please provide trainerId and memberId', 400));
  }

  const trainer = await User.findById(trainerId);
  if (!trainer) return next(new AppError('Trainer not found', 404));
  if (trainer.role !== 'trainer') {
    return next(new AppError('Selected user is not a trainer', 400));
  }

  const member = await User.findById(memberId);
  if (!member) return next(new AppError('Member not found', 404));

  // If a manager is performing this action, restrict to their branch
  if (req.user.role === 'manager') {
    const branch = await Branch.findOne({ manager: req.user.id });
    if (!branch) {
      return next(new AppError('You are not assigned to a branch yet.', 400));
    }

    if (trainer.homeBranch && String(trainer.homeBranch) !== String(branch._id)) {
      return next(new AppError('You can only assign trainers from your branch.', 403));
    }

    if (member.homeBranch && String(member.homeBranch) !== String(branch._id)) {
      return next(new AppError('You can only assign members from your branch.', 403));
    }
  }

  const assignment = await TrainerAssignment.create({
    trainer: trainer._id,
    member: member._id,
    notes: notes || '',
    active: true,
    assignedBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: assignment
  });
});

// @desc    Create a Trainer user
// @route   POST /api/v1/manager/trainers
// @access  Private (Owner or Manager of the branch)
exports.createTrainer = asyncHandler(async (req, res, next) => {
  const { name, email, password, branchId } = req.body;

  if (!name || !email || !password) {
    return next(new AppError('Please provide name, email, and password', 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError('Email already in use', 400));
  }

  let homeBranch = null;

  if (req.user.role === 'manager') {
    const branch = await Branch.findOne({ manager: req.user.id });
    if (!branch) {
      return next(new AppError('You are not assigned to a branch yet.', 400));
    }

    // Managers can only create trainers for their own branch
    if (branchId && String(branchId) !== String(branch._id)) {
      return next(new AppError('You can only create trainers for your branch.', 403));
    }

    homeBranch = branch._id;
  } else {
    // Owner can create trainer for any branch (optional)
    if (branchId) {
      const branch = await Branch.findById(branchId);
      if (!branch) return next(new AppError('Branch not found', 404));
      homeBranch = branch._id;
    }
  }

  const trainer = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'trainer',
    homeBranch
  });

  res.status(201).json({
    success: true,
    data: {
      _id: trainer._id,
      userId: String(trainer._id),
      name: trainer.name,
      email: trainer.email,
      role: trainer.role,
      homeBranch: trainer.homeBranch
    }
  });
});

// @desc    Assign/move a trainer to a branch
// @route   PUT /api/v1/manager/trainers/:id/assign-branch
// @access  Private (Owner or Manager of the branch)
exports.assignTrainerToBranch = asyncHandler(async (req, res, next) => {
  const trainer = await User.findById(req.params.id);
  if (!trainer) return next(new AppError('Trainer not found', 404));
  if (trainer.role !== 'trainer') return next(new AppError('User is not a trainer', 400));

  const { branchId } = req.body;
  if (!branchId) return next(new AppError('Please provide branchId', 400));

  if (req.user.role === 'manager') {
    const branch = await Branch.findOne({ manager: req.user.id });
    if (!branch) return next(new AppError('You are not assigned to a branch yet.', 400));
    if (String(branchId) !== String(branch._id)) {
      return next(new AppError('You can only assign trainers to your branch.', 403));
    }
  }

  const branch = await Branch.findById(branchId);
  if (!branch) return next(new AppError('Branch not found', 404));

  trainer.homeBranch = branch._id;
  await trainer.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: {
      _id: trainer._id,
      userId: String(trainer._id),
      name: trainer.name,
      email: trainer.email,
      role: trainer.role,
      homeBranch: trainer.homeBranch
    }
  });
});
