const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  pin: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash PIN before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('pin')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.pin = await bcrypt.hash(this.pin, salt);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Method to compare PIN
userSchema.methods.comparePIN = async function(enteredPIN) {
  return await bcrypt.compare(enteredPIN, this.pin);
};

module.exports = mongoose.model('User', userSchema);
