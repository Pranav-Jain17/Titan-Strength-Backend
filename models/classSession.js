const mongoose = require('mongoose');

const ClassSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a class title'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    startTime: {
      type: Date,
      required: [true, 'Please add a class start time'],
      index: true
    },
    endTime: {
      type: Date,
      default: null
    },
    trainer: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    },
    capacity: {
      type: Number,
      default: 20,
      min: 1
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled'],
      default: 'scheduled'
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.ClassSession || mongoose.model('ClassSession', ClassSessionSchema);
