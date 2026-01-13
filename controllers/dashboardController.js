const User = require('../models/user');
const Branch = require('../models/Branch'); 
const Subscription = require('../models/subscription');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get Owner Dashboard Data (Global Stats)
// @route   GET /api/v1/dashboards/owner
// @access  Private (Owner only)
exports.getOwnerDashboard = asyncHandler(async (req, res, next) => {
  // 1. Get total counts
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalMembers = await User.countDocuments({ role: 'member' });
  const totalBranches = await Branch.countDocuments(); 
  
  // 2. Get recent subscriptions (Sales)
  const recentSales = await Subscription.find()
    .sort('-createdAt')
    .limit(5)
    .populate('user', 'name email')
    .populate('plan', 'name price');

  // 3. Calculate estimated revenue (Sum of active subscriptions)
  const activeSubs = await Subscription.find({ status: 'active' }).populate('plan');
  const totalRevenue = activeSubs.reduce((acc, sub) => acc + (sub.plan.price || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalMembers,
        totalBranches,
        totalRevenue
      },
      recentSales
    }
  });
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