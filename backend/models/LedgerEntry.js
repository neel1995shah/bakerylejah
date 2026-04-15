const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true,
    trim: true
  },
  in: {
    type: Number,
    default: 0,
    min: 0
  },
  out: {
    type: Number,
    default: 0,
    min: 0
  },
  settled: {
    type: Boolean,
    default: false
  },
  editCount: {
    type: Number,
    default: 0,
    min: 0
  },
  settledAt: {
    type: Date,
    default: null
  },
  total: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ledgerEntrySchema.index({ userId: 1, date: -1, createdAt: -1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
