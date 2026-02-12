const crypto = require('crypto');
const Razorpay = require('razorpay');

const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/appError');

const Plan = require('../models/plan');
const Subscription = require('../models/subscription');
const notify = require('../utils/notify');

const getRazorpayClient = () => {
	if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
		return null;
	}

	return new Razorpay({
		key_id: process.env.RAZORPAY_KEY_ID,
		key_secret: process.env.RAZORPAY_KEY_SECRET
	});
};

// @desc    Get Razorpay public key (safe to expose)
// @route   GET /api/v1/payments/razorpay/key
// @access  Private
exports.getRazorpayKey = asyncHandler(async (req, res, next) => {
	if (!process.env.RAZORPAY_KEY_ID) {
		return next(new AppError('Razorpay key is not configured', 500));
	}

	res.status(200).json({
		success: true,
		data: {
			keyId: process.env.RAZORPAY_KEY_ID
		}
	});
});

// @desc    Create a Razorpay order for purchasing a plan (Cards/UPI handled by Razorpay Checkout)
// @route   POST /api/v1/payments/razorpay/order
// @access  Private
exports.createRazorpayOrder = asyncHandler(async (req, res, next) => {
	const { planId } = req.body;

	const razorpay = getRazorpayClient();
	if (!razorpay) {
		return next(new AppError('Razorpay is not configured', 500));
	}

	if (!planId) {
		return next(new AppError('Please provide planId', 400));
	}

	const plan = await Plan.findById(String(planId).trim());
	if (!plan || plan.active === false) {
		return next(new AppError('Plan not found', 404));
	}

	// Disallow creating a new paid order when an active subscription exists
	const existingSub = await Subscription.findOne({
		user: req.user.id,
		status: 'active',
		endDate: { $gte: new Date() }
	});
	if (existingSub) {
		return next(new AppError('You already have an active subscription', 400));
	}

	const amountPaise = Math.round(Number(plan.price) * 100);
	if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
		return next(new AppError('Invalid plan price', 500));
	}

	const order = await razorpay.orders.create({
		amount: amountPaise,
		currency: 'INR',
		receipt: `plan_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`,
		notes: {
			userId: String(req.user.id),
			planId: String(plan._id)
		}
	});

	res.status(201).json({
		success: true,
		data: {
			keyId: process.env.RAZORPAY_KEY_ID,
			order,
			plan: {
				id: String(plan._id),
				name: plan.name,
				description: plan.description,
				price: plan.price,
				durationDays: plan.durationDays
			}
		}
	});
});

// @desc    Verify Razorpay payment and activate subscription
// @route   POST /api/v1/payments/razorpay/verify
// @access  Private
exports.verifyRazorpayPaymentAndSubscribe = asyncHandler(async (req, res, next) => {
	const {
		planId,
		razorpay_order_id,
		razorpay_payment_id,
		razorpay_signature
	} = req.body;

	if (!process.env.RAZORPAY_KEY_SECRET) {
		return next(new AppError('Razorpay is not configured', 500));
	}

	if (!planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
		return next(new AppError('Missing payment verification fields', 400));
	}

	const plan = await Plan.findById(String(planId).trim());
	if (!plan || plan.active === false) {
		return next(new AppError('Plan not found', 404));
	}

	// Verify signature: HMAC_SHA256(order_id|payment_id)
	const body = `${razorpay_order_id}|${razorpay_payment_id}`;
	const expected = crypto
		.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
		.update(body)
		.digest('hex');

	if (expected !== razorpay_signature) {
		return next(new AppError('Invalid payment signature', 400));
	}

	// Ensure no active subscription exists
	const existingSub = await Subscription.findOne({
		user: req.user.id,
		status: 'active',
		endDate: { $gte: new Date() }
	});

	if (existingSub) {
		return next(new AppError('You already have an active subscription', 400));
	}

	const endDate = new Date();
	endDate.setDate(endDate.getDate() + Number(plan.durationDays || 0));

	const subscription = await Subscription.create({
		user: req.user.id,
		plan: plan._id,
		startDate: new Date(),
		endDate,
		status: 'active',
		paymentMethod: 'razorpay',
		paymentProvider: 'razorpay',
		paymentId: String(razorpay_payment_id),
		paymentOrderId: String(razorpay_order_id),
		currency: 'INR',
		amountPaid: plan.price
	});

	// Upgrade user to member (matches existing behavior)
	req.user.role = 'member';
	await req.user.save({ validateBeforeSave: false });

	await notify({
		userId: req.user.id,
		title: 'Payment Successful',
		message: `You have successfully purchased the ${plan.name} plan. Let's get to work!`,
		type: 'success',
		sendMail: true
	});

	res.status(201).json({
		success: true,
		data: subscription
	});
});

// // @desc    Stripe Webhook (Listens for Stripe events)
// // @route   POST /api/v1/payments/webhook
// exports.webhookCheckout = async (req, res) => {
//   const signature = req.headers['stripe-signature'];

//   let event;

//   try {
//     // 1. Verify this request actually came from Stripe
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       signature,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error(`Webhook Error: ${err.message}`);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // 2. If Payment Succeeded
//   if (event.type === 'checkout.session.completed') {
//     const session = event.data.object;

//     // 3. Create Subscription in Database
//     await createSubscriptionCheckout(session);
//   }

//   // 4. Return 200 OK to Stripe
//   res.status(200).json({ received: true });
// };