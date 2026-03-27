import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product'
  },
  productName: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: [1, 'Quantity can not be less then 1.'] 
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  unitType: {
    type: String,
    enum: ['qty', 'kg', 'grams'],
    default: 'qty'
  },
  note: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

orderItemSchema.pre('validate', function () {
  if (!this.product && !this.productName) {
    throw new Error('Each item must have a product reference or product name');
  }
});

const orderSchema = new mongoose.Schema({
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true,
    index: true
  },
  items: [orderItemSchema],
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid', 'failed'], 
    default: 'pending',
    index: true
  },
  deliveryStatus: { 
    type: String, 
    enum: ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled', 'issue'], 
    default: 'pending',
    index: true
  },
  assignedWorker: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  assignedBySelf: {
    type: Boolean,
    default: false
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  confirmedAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  issueRaisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  issueRaisedAt: {
    type: Date
  },
  issueNote: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

// Optimizing to filter active deliveries by worker
orderSchema.index({ assignedWorker: 1, deliveryStatus: 1 });

export default mongoose.model('Order', orderSchema);
