const Subscription = require('../models/subscription');

const isActiveSubscription = (subscription) => {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (!subscription.endDate) return false;
  return new Date(subscription.endDate).getTime() >= Date.now();
};

const findActiveSubscriptionForUser = async (userId) => {
  return Subscription.findOne({
    user: userId,
    status: 'active',
    endDate: { $gte: new Date() }
  }).populate('plan', 'name price durationDays');
};

module.exports = {
  isActiveSubscription,
  findActiveSubscriptionForUser
};
