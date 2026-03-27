import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    unique: true // One inventory record per product
  },
  quantity: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0
  },
  unit: {
    type: String, // e.g., 'kg', 'lbs', 'pcs'
    default: 'pcs'
  },
  reorderLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  lastRestocked: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Check for low stock easily via indexing
inventorySchema.index({ quantity: 1, reorderLevel: 1 });

export default mongoose.model('Inventory', inventorySchema);
