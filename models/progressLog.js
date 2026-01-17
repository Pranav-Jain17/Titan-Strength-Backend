const mongoose = require('mongoose');

const ProgressLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    trainer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    },
    weight: {
      type: Number,
      default: null
    },
    bodyFatPercent: {
      type: Number,
      default: null
    },
    bicepSize: {
      type: Number,
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

ProgressLogSchema.index({ user: 1, trainer: 1, date: -1 });

module.exports = mongoose.models.ProgressLog || mongoose.model('ProgressLog', ProgressLogSchema);
