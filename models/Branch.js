const mongoose = require('mongoose');

const BranchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a branch name'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name can not be more than 50 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description can not be more than 500 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    maxlength: [20, 'Phone number can not be longer than 20 characters']
  },
  email: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'], 
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
      default: [0, 0] 
    }
  },
  facilities: {
    type: [String],
    enum: ['Wifi', 'Parking', 'Pool', 'Sauna', 'Cardio', 'Weights', 'Showers', 'Yoga Studio'],
    default: ['Weights', 'Cardio']
  },
  capacity: {
    type: Number,
    default: 100
  },
  manager: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: See all users/members whose home branch is this gym
BranchSchema.virtual('members', {
  ref: 'User',
  localField: '_id',
  foreignField: 'homeBranch',
  justOne: false
});

module.exports = mongoose.model('Branch', BranchSchema);