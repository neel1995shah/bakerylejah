import mongoose from 'mongoose';

const ledgerSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  type: {
    type: String,
    enum: ['gave', 'got'],
    required: true
  },
  runningBalance: {
    type: Number,
    required: true
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }
}, { timestamps: true });

// Ensure either customer or supplier is present
ledgerSchema.pre('validate', function(next) {
  if (!this.customer && !this.supplier) {
    return next(new Error('Transaction must be linked to a customer or supplier.'));
  }
  next();
});

export default mongoose.model('Ledger', ledgerSchema);
