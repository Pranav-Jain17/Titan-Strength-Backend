const Stripe = require('stripe');
const Plan = require('../models/plan');
const User = require('../models/user'); // Import User model
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

// Initialize Stripe with your Secret Key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create Stripe Checkout Session
// @route   POST /api/v1/payments/checkout-session/:planId
// @access  Private (User)
exports.getCheckoutSession = asyncHandler(async (req, res, next) => {
  const planId = req.params.planId.trim(); 
  // 2. Use the clean ID
  const plan = await Plan.findById(planId);
  if (!plan) {
    return next(new AppError('Plan not found', 404));
  }

  // 2. Create the Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment', // Use 'subscription' if you want recurring billing later
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/plans`,
    customer_email: req.user.email, // Pre-fill user's email
    client_reference_id: req.params.planId, // We pass the Plan ID to track what they bought
    line_items: [
      {
        price_data: {
          currency: 'usd', // or 'inr'
          product_data: {
            name: plan.name,
            description: plan.description,
          },
          unit_amount: plan.price * 100, // Stripe expects amount in Cents ($50 = 5000)
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: req.user.id, // We hide the User ID here so we can read it later
      planId: req.params.planId
    }
  });

  // 3. Send the session URL to the frontend
  res.status(200).json({
    success: true,
    url: session.url // Frontend will redirect window.location.href to this URL
  });
});