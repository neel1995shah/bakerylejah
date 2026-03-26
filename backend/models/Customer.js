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
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
    unique: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String }
  },
  dues: { 
    type: Number, 
    default: 0,
    min: 0 
  }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
