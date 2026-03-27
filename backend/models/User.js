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
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['manager', 'worker'], 
    default: 'worker',
    index: true
  },
  contactNumber: {
    type: String,
    trim: true
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
