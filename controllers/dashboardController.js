const User = require('../models/user');
const Branch = require('../models/branch'); 
const Subscription = require('../models/subscription');
const asyncHandler = require('../middleware/asyncHandler');
const ownerController = require('./ownerController');

// @desc    Get Owner Dashboard Data (Global Stats)
// @route   GET /api/v1/dashboards/owner
// @access  Private (Owner only)
exports.getOwnerDashboard = asyncHandler(async (req, res, next) => {
  return ownerController.getOwnerDashboard(req, res, next);
});

// @desc    Get Manager Dashboard Data (Branch specific)
// @route   GET /api/v1/dashboards/manager
// @access  Private (Manager only)
exports.getManagerDashboard = asyncHandler(async (req, res, next) => {
  // 1. Find the Branch this manager is assigned to
  // Your schema uses 'manager' (singular), so we query that field
  const branch = await Branch.findOne({ manager: req.user.id });

  if (!branch) {
    return res.status(200).json({ 
      success: true, 
      data: { message: "You are not assigned to a branch yet." } 
    });
  }

  // 2. Get Members active in this system
  // (Later, if you link users to specific branches, you can filter here)
  const totalMembers = await User.countDocuments({ role: 'member' });

  res.status(200).json({
    success: true,
    data: {
      branchName: branch.name,
      location: branch.address,
      stats: {
        totalMembers: totalMembers,
        capacity: branch.capacity
      }
    }
  });
});

// @desc    Get Member Dashboard Data (Personal)
// @route   GET /api/v1/dashboards/member
// @access  Private (Member only)
exports.getMemberDashboard = asyncHandler(async (req, res, next) => {
  // 1. Get their active subscription
  const activeSub = await Subscription.findOne({ 
    user: req.user.id, 
    status: 'active' 
  }).populate('plan', 'name features');

  res.status(200).json({
    success: true,
    data: {
      userName: req.user.name,
      membership: activeSub ? {
        planName: activeSub.plan.name,
        expiresOn: activeSub.endDate,
        status: 'Active'
      } : null,
      notifications: [] 
    }
  });
});

// @desc    Get Trainer Dashboard Data (Schedule & Classes)
// @route   GET /api/v1/dashboards/trainer
// @access  Private (Trainer only)
exports.getTrainerDashboard = asyncHandler(async (req, res, next) => {
  // 1. Identify the Trainer
  const trainerId = req.user.id;

  // 2. TODO: Fetch upcoming classes (We will build the ClassSession model next!)
  // const upcomingClasses = await ClassSession.find({ trainer: trainerId, startTime: { $gte: Date.now() } });
  
  // For now, return a placeholder so the frontend doesn't crash
  res.status(200).json({
    success: true,
    data: {
      trainerName: req.user.name,
      todaySchedule: [], // This will eventually hold the list of classes for today
      nextClass: null,   // This will show "Yoga at 6:00 PM"
      messages: "You have no classes scheduled yet."
    }
  });
});