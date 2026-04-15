const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { JWT_SECRET } = require('../config/jwt');

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = String(decoded?.userId || '');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId }).sort({ createdAt: -1 });
    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

router.put('/read-all', verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.userId, read: false }, { $set: { read: true } });
    return res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

router.delete('/', verifyToken, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.userId });
    return res.json({ message: 'Notifications cleared' });
  } catch (error) {
    return res.status(500).json({ message: 'Error clearing notifications', error: error.message });
  }
});

module.exports = router;
