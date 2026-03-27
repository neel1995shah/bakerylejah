import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true,
    enum: ['customer', 'supplier']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  type: {
    type: String,
    required: true,
    enum: ['you_gave', 'you_got']
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  balanceAfter: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

transactionSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('Transaction', transactionSchema);
