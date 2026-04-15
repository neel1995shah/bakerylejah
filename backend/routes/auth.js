const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const router = express.Router();
const OWNER_USERNAME = String(process.env.OWNER_USERNAME || '').trim().toLowerCase();

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const getLoginKey = (req, username) => `${req.ip || 'unknown'}:${String(username || '').toLowerCase().trim()}`;

const isLoginBlocked = (key) => {
  const record = loginAttempts.get(key);
  if (!record) {
    return false;
  }

  if (Date.now() > record.resetAt) {
    loginAttempts.delete(key);
    return false;
  }

  return record.count >= MAX_LOGIN_ATTEMPTS;
};

const registerFailedLogin = (key) => {
  const current = loginAttempts.get(key);
  const nextCount = current ? current.count + 1 : 1;
  loginAttempts.set(key, {
    count: nextCount,
    resetAt: Date.now() + LOGIN_WINDOW_MS
  });
};

const clearLoginAttempts = (key) => {
  loginAttempts.delete(key);
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, pin } = req.body;
    const loginKey = getLoginKey(req, username);

    if (isLoginBlocked(loginKey)) {
      return res.status(429).json({ message: 'Too many login attempts. Try again later.' });
    }

    if (!username || !pin) {
      return res.status(400).json({ message: 'Username and PIN required' });
    }

    if (OWNER_USERNAME && String(username).trim().toLowerCase() !== OWNER_USERNAME) {
      registerFailedLogin(loginKey);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      registerFailedLogin(loginKey);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare PIN
    const isMatch = await user.comparePIN(pin);
    if (!isMatch) {
      registerFailedLogin(loginKey);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    clearLoginAttempts(loginKey);

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Register endpoint is intentionally disabled for owner-only deployments.
router.post('/register', async (req, res) => {
  return res.status(403).json({ message: 'Registration is disabled for owner-only mode' });
});

module.exports = router;
