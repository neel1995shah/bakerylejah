import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  dues: { 
    type: Number, 
    default: 0
  }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
