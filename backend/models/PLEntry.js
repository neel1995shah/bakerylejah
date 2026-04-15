const mongoose = require('mongoose');

const plEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entryCode: {
    type: String,
    trim: true,
    index: true,
    sparse: true,
    unique: true
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
  bonus: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  notes: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500
  },
  settled: {
    type: Boolean,
    default: false
  },
  settledAt: {
    type: Date,
    default: null
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

plEntrySchema.index({ userId: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('PLEntry', plEntrySchema);
