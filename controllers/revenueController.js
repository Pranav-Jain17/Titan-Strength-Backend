const Subscription = require('../models/subscription');
const asyncHandler = require('../middleware/asyncHandler');
const { buildMonthKeysUTC } = require('../utils/revenueChartUtils');

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

  const revenueByMonth = new Map(
    agg.map((row) => [row._id, { revenue: row.revenue, sales: row.sales }])
  );

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
