const mongoose = require('mongoose');

const DietSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a diet plan name'],
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    goalType: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'maintenance', 'general'],
      default: 'general'
    },
    // Flexible structure for the actual plan (meals, macros, days, etc.)
    plan: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    active: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Diet || mongoose.model('Diet', DietSchema);
