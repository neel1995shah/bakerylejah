import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const registerUser = async (req, res) => {
  const { name, username, pin, role } = req.body;

  if (!/^\d{4}$/.test(String(pin || ''))) {
    return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(String(pin), salt);

    const user = await User.create({ name, username, pin: hashedPin, role });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const authUser = async (req, res) => {
  const { username, pin } = req.body;
  console.log(`Login attempt for username: ${username}`);

  if (!/^\d{4}$/.test(String(pin || ''))) {
    return res.status(400).json({ message: 'PIN must be exactly 4 digits' });
  }
  
  try {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });
    console.log(`User found: ${!!user}`);

    if (user) {
      if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingMs = user.lockUntil.getTime() - Date.now();
        const remainingMinutes = Math.ceil(remainingMs / 60000);
        console.warn(`User ${username} is locked for ${remainingMinutes} more minutes.`);
        return res.status(423).json({
          message: `Session suspended due to 3 wrong PIN attempts. Try again in ${remainingMinutes} minute(s).`
        });
      }

      const isMatch = await bcrypt.compare(String(pin), user.pin);
      console.log(`PIN verification for ${username}: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
      
      if (isMatch) {
        if (user.failedPinAttempts !== 0 || user.lockUntil) {
          user.failedPinAttempts = 0;
          user.lockUntil = null;
          await user.save();
        }

        res.json({
          _id: user._id,
          username: user.username,
          role: user.role,
          token: generateToken(user._id),
        });
        return;
      }

      user.failedPinAttempts = (user.failedPinAttempts || 0) + 1;

      if (user.failedPinAttempts >= 3) {
        user.failedPinAttempts = 0;
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();
        console.warn(`User ${username} locked due to too many failed attempts.`);
        return res.status(423).json({
          message: 'Session suspended for 30 minutes after 3 wrong PIN attempts.'
        });
      }

      await user.save();
      return res.status(401).json({
        message: `Invalid PIN. ${3 - user.failedPinAttempts} attempt(s) remaining before 30 minute suspension.`
      });
    }
    
    // Check if any users exist in the DB at all to provide better feedback
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.error('CRITICAL: No users found in database. Did you run the seed script?');
    } else {
      console.log(`Login failed: User "${username}" not found.`);
    }

    res.status(401).json({ message: 'Invalid credentials' });
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const filter = req.query.role ? { role: req.query.role } : {};
    const users = await User.find(filter).select('-pin');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret');
};