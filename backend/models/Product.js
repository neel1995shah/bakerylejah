import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    index: true,
    trim: true
  },
  quantitySize: {
    type: String,
    trim: true,
    default: ''
  },
  description: { 
    type: String,
    trim: true 
  },
  sku: { 
    type: String, 
    unique: true, 
    sparse: true,
    trim: true,
    uppercase: true
  },
  category: { 
    type: String, 
    index: true,
    trim: true
  },
  basePrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  imageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
