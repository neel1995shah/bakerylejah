const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const { saveSubscription } = require('../utils/realtimeNotifications');

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/subscribe', verifyToken, async (req, res) => {
  try {
    const { subscription } = req.body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ message: 'Valid push subscription required' });
    }

    await saveSubscription(req.userId, subscription, req.headers['user-agent'] || '');

    return res.json({ message: 'Push subscription saved' });
  } catch (error) {
    return res.status(500).json({ message: 'Error saving push subscription', error: error.message });
  }
});

module.exports = router;