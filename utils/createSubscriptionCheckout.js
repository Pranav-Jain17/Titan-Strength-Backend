const User = require('../models/user');
const Subscription = require('../models/subscription');
const Plan = require('../models/plan');

const createSubscriptionCheckout = async (session) => {
  const planId = session.metadata.planId.trim();
  const userId = session.metadata.userId.trim();

  // Find User & Plan
  const user = await User.findById(userId);
  const plan = await Plan.findById(planId);

  // Calculate Expiry Date
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // Create Subscription Document
  await Subscription.create({
    user: userId,
    plan: planId,
    startDate: Date.now(),
    endDate,
    status: 'active',
    paymentMethod: 'stripe',
    transactionId: session.payment_intent
  });

  // Upgrade User Role to 'member'
  user.role = 'member';
  await user.save({ validateBeforeSave: false });

  console.log(`SUCCESS: User ${user.email} upgraded to Member!`);
};

module.exports = createSubscriptionCheckout;
