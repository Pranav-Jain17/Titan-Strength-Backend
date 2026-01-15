const mongoose = require('mongoose');

const ClassAttendanceSchema = new mongoose.Schema(
  {
    classSession: {
      type: mongoose.Schema.ObjectId,
      ref: 'ClassSession',
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['booked', 'present', 'absent'],
      default: 'booked'
    },
    markedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    },
    markedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

ClassAttendanceSchema.index({ classSession: 1, user: 1 }, { unique: true });

module.exports = mongoose.models.ClassAttendance || mongoose.model('ClassAttendance', ClassAttendanceSchema);
