import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    trim: true,
    lowercase: true
  },
  pin: {
    type: String,
    required: true
  },
  failedPinAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  role: { 
    type: String, 
    enum: ['owner', 'sub_manager', 'manager', 'worker'], 
    default: 'worker',
    index: true
  },
  contactNumber: {
    type: String,
    trim: true
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
