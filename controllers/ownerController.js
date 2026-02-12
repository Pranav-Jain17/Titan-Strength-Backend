const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const User = require('../models/user');
const Branch = require('../models/branch');
const Subscription = require('../models/subscription');
const Plan = require('../models/plan');
const { buildMonthKeysUTC } = require('../utils/revenueChartUtils');
const notify = require('../utils/notify');

// @desc    List managers + the branch they manage
// @route   GET /api/v1/owner/managers
// @access  Private (Owner)
exports.getManagers = asyncHandler(async (req, res) => {
  const managers = await User.find({ role: 'manager' }).select('name email role status createdAt');
  const managerIds = managers.map((m) => m._id);

  const branches = await Branch.find({ manager: { $in: managerIds } }).select('name manager');
  const branchByManager = new Map(branches.map((b) => [String(b.manager), b]));

  res.status(200).json({
    success: true,
    count: managers.length,
    data: managers.map((m) => {
      const branch = branchByManager.get(String(m._id));
      return {
        _id: m._id,
        userId: String(m._id),
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        createdAt: m.createdAt,
        branch: branch ? { branchId: String(branch._id), name: branch.name } : null
      };
    })
  });
});

// @desc    Revenue chart data for Owner (last N months)
// @route   GET /api/v1/owner/revenue-chart?months=6
// @access  Private (Owner only)
exports.getRevenueChart = asyncHandler(async (req, res, next) => {
  const monthsRaw = Number.parseInt(req.query.months, 10);
  const months = Number.isFinite(monthsRaw) ? monthsRaw : 6;
  const safeMonths = Math.min(Math.max(months, 1), 24);

  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  startDate.setUTCMonth(startDate.getUTCMonth() - (safeMonths - 1));

  const agg = await Subscription.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $lookup: {
        from: 'plans',
        localField: 'plan',
        foreignField: '_id',
        as: 'planDoc'
      }
    },
    {
      $addFields: {
        planPrice: {
          $ifNull: [{ $first: '$planDoc.price' }, 0]
        },
        monthKey: {
          $dateToString: {
            format: '%Y-%m',
            date: '$createdAt'
          }
        }
      }
    },
    {
      $group: {
        _id: '$monthKey',
        revenue: { $sum: '$planPrice' },
        sales: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const revenueByMonth = new Map(agg.map((row) => [row._id, { revenue: row.revenue, sales: row.sales }]));

  const monthKeys = buildMonthKeysUTC(safeMonths);

  const data = monthKeys.map((key) => {
    const found = revenueByMonth.get(key);
    return {
      month: key,
      revenue: found ? found.revenue : 0,
      sales: found ? found.sales : 0
    };
  });

  res.status(200).json({
    success: true,
    range: {
      months: safeMonths,
      from: monthKeys[0],
      to: monthKeys[monthKeys.length - 1]
    },
    data
  });
});

// @desc    Get Owner Dashboard Data (Global Stats)
// @route   GET /api/v1/dashboards/owner
// @access  Private (Owner only)
exports.getOwnerDashboard = asyncHandler(async (req, res, next) => {
  const totalUsers = await User.countDocuments({ role: 'user' });
  const totalMembers = await User.countDocuments({ role: 'member' });
  const totalBranches = await Branch.countDocuments();

  const recentSales = await Subscription.find()
    .sort('-createdAt')
    .limit(5)
    .populate('user', 'name email')
    .populate('plan', 'name price');

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

// @desc    Create a plan
// @route   POST /api/v1/plans
// @access  Private (Owner Only)
exports.createPlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.create(req.body);

  const users = await User.find({
    role: { $in: ['member', 'trainer'] },
    status: 'active'
  }).select('_id');

  users.forEach((u) => {
    notify({
      userId: u._id,
      title: 'New Plan Added',
      message: `A new plan is now available: ${plan.name}. Check it out in the app.`,
      type: 'info',
      sendMail: true
    });
  });

  res.status(201).json({
    success: true,
    data: plan
  });
});

// @desc    Update plan
// @route   PUT /api/v1/plans/:id
// @access  Private (Owner Only)
exports.updatePlan = asyncHandler(async (req, res, next) => {
  let plan = await Plan.findById(req.params.id);

  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({ success: true, data: plan });
});

// @desc    Delete plan (Soft delete)
// @route   DELETE /api/v1/plans/:id
// @access  Private (Owner Only)
exports.deletePlan = asyncHandler(async (req, res, next) => {
  const plan = await Plan.findById(req.params.id);

  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  plan.active = false;
  await plan.save();

  res.status(200).json({ success: true, data: {} });
});

// @desc    Create new branch
// @route   POST /api/v1/branches
// @access  Private (Owner only)
exports.createBranch = asyncHandler(async (req, res, next) => {
  const { manager } = req.body;

  if (manager) {
    const user = await User.findById(manager);

    if (!user) {
      return next(new AppError(`No user found with id ${manager}`, 404));
    }

    if (user.role !== 'manager') {
      return next(new AppError(`The user ${user.name} is not a Manager. Please update their role first.`, 400));
    }

    const existingBranch = await Branch.findOne({ manager });
    if (existingBranch) {
      return next(new AppError(`Manager ${user.name} is already assigned to ${existingBranch.name}`, 400));
    }
  }

  const branch = await Branch.create(req.body);

  const users = await User.find({
    role: { $in: ['member', 'trainer'] },
    status: 'active'
  }).select('_id');

  users.forEach((u) => {
    notify({
      userId: u._id,
      title: 'New Location Opened',
      message: `We are excited to announce our new branch: ${branch.name} at ${branch.address}. Come visit us!`,
      type: 'info',
      sendMail: true
    });
  });

  res.status(201).json({
    success: true,
    data: branch
  });
});

// @desc    Delete branch
// @route   DELETE /api/v1/branches/:id
// @access  Private (Owner only)
exports.deleteBranch = asyncHandler(async (req, res, next) => {
  const branch = await Branch.findById(req.params.id);

  if (!branch) {
    return next(new AppError(`Branch not found with id of ${req.params.id}`, 404));
  }

  if (req.user.role !== 'owner') {
    return next(new AppError(`Not authorized to delete branches`, 403));
  }

  await branch.deleteOne();

  res.status(200).json({ success: true, data: {} });
});
