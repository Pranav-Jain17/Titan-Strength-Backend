const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Equipment',
      default: null
    },
    description: {
      type: String,
      required: [true, 'Please add a maintenance description'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'fixed'],
      default: 'pending'
    },
    reportedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Maintenance || mongoose.model('Maintenance', MaintenanceSchema);
