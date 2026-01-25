const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.ObjectId,
    ref: 'Plan',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'stripe', 'razorpay', 'manual'],
    default: 'manual'
  },
  paymentProvider: {
    type: String,
    enum: ['manual', 'stripe', 'razorpay'],
    default: 'manual'
  },
  paymentId: {
    type: String,
    default: ''
  },
  paymentOrderId: {
    type: String,
    default: ''
  },
  amountPaid: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: ''
  }
}, { timestamps: true });

SubscriptionSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Subscription', SubscriptionSchema);