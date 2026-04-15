const express = require('express');
const jwt = require('jsonwebtoken');
const CryptoAddress = require('../models/CryptoAddress');
const { JWT_SECRET } = require('../config/jwt');

const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const buildScopeQuery = (req, extraQuery = {}) => {
  return {
    ...extraQuery,
    userId: req.userId
  };
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const { accountName } = req.query;
    const scopeQuery = await buildScopeQuery(req);
    const query = { ...scopeQuery };

    if (accountName && String(accountName).trim()) {
      query.accountName = { $regex: String(accountName).trim(), $options: 'i' };
    }

    const rows = await CryptoAddress.find(query).sort({ accountName: 1, createdAt: -1 });
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching crypto addresses', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const accountName = String(req.body.accountName || '').trim();
    const cryptoAddress = String(req.body.cryptoAddress || '').trim();

    if (!accountName || !cryptoAddress) {
      return res.status(400).json({ message: 'accountName and cryptoAddress are required' });
    }

    const updated = await CryptoAddress.findOneAndUpdate(
      { userId: req.userId, accountName },
      {
        userId: req.userId,
        accountName,
        cryptoAddress,
        updatedAt: new Date()
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(201).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Error saving crypto address', error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const accountName = String(req.body.accountName || '').trim();
    const cryptoAddress = String(req.body.cryptoAddress || '').trim();

    if (!accountName || !cryptoAddress) {
      return res.status(400).json({ message: 'accountName and cryptoAddress are required' });
    }

    const scopeQuery = await buildScopeQuery(req, { _id: req.params.id });
    const updated = await CryptoAddress.findOneAndUpdate(
      scopeQuery,
      {
        accountName,
        cryptoAddress,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Crypto address not found' });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Error updating crypto address', error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req, { _id: req.params.id });
    const deleted = await CryptoAddress.findOneAndDelete(scopeQuery);

    if (!deleted) {
      return res.status(404).json({ message: 'Crypto address not found' });
    }

    return res.json({ message: 'Crypto address deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting crypto address', error: error.message });
  }
});

module.exports = router;
