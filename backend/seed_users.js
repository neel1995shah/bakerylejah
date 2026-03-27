import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grocery');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users.');

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash('1234', salt);

    await User.create([
      { name: 'Owner One', username: 'owner1', pin: hashedPin, role: 'owner', failedPinAttempts: 0, lockUntil: null },
      { name: 'Owner Two', username: 'owner2', pin: hashedPin, role: 'owner', failedPinAttempts: 0, lockUntil: null },
      { name: 'Owner Three', username: 'owner3', pin: hashedPin, role: 'owner', failedPinAttempts: 0, lockUntil: null },
      { name: 'Sub Manager One', username: 'submanager1', pin: hashedPin, role: 'sub_manager', failedPinAttempts: 0, lockUntil: null },
      { name: 'Worker One', username: 'worker1', pin: hashedPin, role: 'worker', failedPinAttempts: 0, lockUntil: null },
      { name: 'Worker Two', username: 'worker2', pin: hashedPin, role: 'worker', failedPinAttempts: 0, lockUntil: null },
      { name: 'Worker Three', username: 'worker3', pin: hashedPin, role: 'worker', failedPinAttempts: 0, lockUntil: null }
    ]);

    console.log('Seeded 7 users: 3 owners, 1 sub-manager, 3 workers (all use PIN 1234)');
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

seedUsers();
