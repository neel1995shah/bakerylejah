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
    const hashedPassword = await bcrypt.hash('password123', salt);

    await User.create([
      { name: 'Admin User', username: 'admin', password: hashedPassword, role: 'manager' },
      { name: 'Worker One', username: 'worker1', password: hashedPassword, role: 'worker' }
    ]);

    console.log('Seeded Users: manager (admin/password123), worker (worker1/password123)');
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

seedUsers();
