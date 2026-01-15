const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    checkedOutAt: {
      type: Date,
      default: null,
      index: true
    },
    note: {
      type: String,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

AttendanceSchema.index({ user: 1, checkedOutAt: 1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
