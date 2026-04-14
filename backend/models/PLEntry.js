const mongoose = require('mongoose');

const plEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  handler: {
    type: String,
    required: true,
    trim: true
  },
  acc: {
    type: String,
    required: true,
    trim: true
  },
  in: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  out: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  charges: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  netProfit: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PLEntry', plEntrySchema);
