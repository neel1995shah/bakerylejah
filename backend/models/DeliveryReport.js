import mongoose from 'mongoose';

const deliveryReportSchema = new mongoose.Schema({
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true,
    index: true
  },
  worker: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  status: { 
    type: String, 
    enum: ['successful', 'failed', 'delayed', 'customer_unavailable'], 
    required: true 
  },
  customerFeedback: {
    type: String,
    maxLength: 500,
    trim: true
  },
  workerNotes: {
    type: String,
    maxLength: 500,
    trim: true
  },
  deliveryDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('DeliveryReport', deliveryReportSchema);
