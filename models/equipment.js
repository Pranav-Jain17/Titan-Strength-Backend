const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add equipment name'],
      trim: true
    },
    tag: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['working', 'out_of_order', 'maintenance'],
      default: 'working'
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);
