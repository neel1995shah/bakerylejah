const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actorUsername: {
    type: String,
    required: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  module: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    required: true,
    trim: true
  },
  changes: {
    type: [String],
    default: []
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
