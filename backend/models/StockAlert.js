import mongoose from 'mongoose';

const stockAlertSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  imageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  imagePublicId: {
    type: String,
    trim: true,
    default: ''
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'completed'],
    default: 'open',
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('StockAlert', stockAlertSchema);
