const mongoose = require('mongoose');

const cryptoAddressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  cryptoAddress: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

cryptoAddressSchema.index({ userId: 1, accountName: 1 }, { unique: true });

module.exports = mongoose.model('CryptoAddress', cryptoAddressSchema);
