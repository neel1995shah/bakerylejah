import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
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
  }
}, { _id: false });

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
    enum: ['pending', 'assigned', 'in-transit', 'delivered', 'cancelled'], 
    default: 'pending',
    index: true
  },
  assignedWorker: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  }
}, { timestamps: true });

// Optimizing to filter active deliveries by worker
orderSchema.index({ assignedWorker: 1, deliveryStatus: 1 });

export default mongoose.model('Order', orderSchema);
