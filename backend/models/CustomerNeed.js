import mongoose from 'mongoose';

const customerNeedSchema = new mongoose.Schema({
  requirement: {
    type: String,
    required: true,
    trim: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true,
    default: ''
  },
  imageUrls: {
    type: [String],
    default: []
  },
  imagePublicIds: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'done'],
    default: 'open',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doneBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  doneAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('CustomerNeed', customerNeedSchema);
