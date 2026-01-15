const mongoose = require('mongoose');

const DietAssignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    diet: {
      type: mongoose.Schema.ObjectId,
      ref: 'Diet',
      default: null
    },
    // Optional custom plan per member (overrides diet.plan)
    customPlan: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    notes: {
      type: String,
      default: ''
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    },
    assignedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

DietAssignmentSchema.index({ user: 1, active: 1 });

module.exports = mongoose.models.DietAssignment || mongoose.model('DietAssignment', DietAssignmentSchema);
