const mongoose = require('mongoose');

const TrainerAssignmentSchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    member: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    notes: {
      type: String,
      default: ''
    },
    active: {
      type: Boolean,
      default: true
    },
    assignedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

TrainerAssignmentSchema.index({ trainer: 1, member: 1, active: 1 });

module.exports = mongoose.models.TrainerAssignment || mongoose.model('TrainerAssignment', TrainerAssignmentSchema);
