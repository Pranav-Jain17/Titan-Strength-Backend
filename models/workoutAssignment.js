const mongoose = require('mongoose');

const WorkoutAssignmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    video: {
      type: mongoose.Schema.ObjectId,
      ref: 'Video',
      default: null
    },
    // Optional custom workout plan per member
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

WorkoutAssignmentSchema.index({ user: 1, active: 1 });

module.exports = mongoose.models.WorkoutAssignment || mongoose.model('WorkoutAssignment', WorkoutAssignmentSchema);
