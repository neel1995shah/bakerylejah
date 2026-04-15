const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');
const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ message: 'Username and PIN required' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare PIN
    const isMatch = await user.comparePIN(pin);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token without expiry so session ends only on explicit logout.
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Register endpoint (for initial setup)
router.post('/register', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin || pin.length !== 4) {
      return res.status(400).json({ message: 'Username and 4-digit PIN required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user
    const user = new User({ username, pin });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
