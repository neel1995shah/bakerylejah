const express = require('express');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Add transaction
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, category, amount, description, date } = req.body;

    const transaction = new Transaction({
      userId: req.userId,
      type,
      category,
      amount,
      description,
      date: date || new Date()
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(500).json({ message: 'Error creating transaction', error: err.message });
  }
});

// Get all transactions for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching transactions', error: err.message });
  }
});

// Get P&L summary
router.get('/summary/pl', verifyToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const profit = income - expenses;

    res.json({ income, expenses, profit });
  } catch (err) {
    res.status(500).json({ message: 'Error calculating P&L', error: err.message });
  }
});

module.exports = router;
