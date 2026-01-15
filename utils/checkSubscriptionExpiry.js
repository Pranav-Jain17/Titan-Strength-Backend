const cron = require('node-cron');
const User = require('../models/user');
const Subscription = require('../models/subscription');

const checkSubscriptionExpiry = () => {
  // Schedule the task to run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running daily subscription expiry check...');

    try {
      const today = new Date();

      // 1. Find all ACTIVE subscriptions that have EXPIRED (endDate < today)
      const expiredSubs = await Subscription.find({
        status: 'active',
        endDate: { $lt: today }
      });

      if (expiredSubs.length === 0) {
        console.log('✅ No expired subscriptions found today.');
        return;
      }

      console.log(`found ${expiredSubs.length} expired subscriptions. Processing...`);

      // 2. Process each expired subscription
      for (const sub of expiredSubs) {
        // A. Mark subscription as expired
        sub.status = 'expired';
        await sub.save();

        // B. Downgrade the User
        const user = await User.findById(sub.user);
        if (user) {
          user.role = 'user'; // Downgrade from 'member' to 'user'
          await user.save({ validateBeforeSave: false });
          console.log(`🔻 Downgraded User: ${user.email}`);
        }
      }
      
      console.log('🏁 Expiry check complete.');

    } catch (err) {
      console.error('❌ Error in subscription expiry cron job:', err);
    }
  });
};

module.exports = checkSubscriptionExpiry;