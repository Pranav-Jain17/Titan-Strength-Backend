const mongoose = require('mongoose');

const PlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a plan name'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a price']
  },
  durationDays: {
    type: Number,
    required: [true, 'Please add duration in days'], 
    default: 30
  },
  features: {
    canBookClasses: { type: Boolean, default: true },
    maxClassesPerWeek: { type: Number, default: 3 },
    accessAllBranches: { type: Boolean, default: false }, 
    includesPersonalTraining: { type: Boolean, default: false }
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);