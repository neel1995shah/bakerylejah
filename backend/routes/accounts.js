const express = require('express');
const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const User = require('../models/User');

const router = express.Router();
const FIRM_NAMES = ['krish', 'harsh', 'harssh', 'meet'];
const FIRM_USERNAME_REGEX = new RegExp(`^(${FIRM_NAMES.join('|')})$`, 'i');

const normalizeName = (value) => (value || '').toLowerCase().trim();
const isFirmMember = (username) => FIRM_NAMES.includes(normalizeName(username));

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const buildScopeQuery = async (req, extraQuery = {}) => {
  if (!isFirmMember(req.username)) {
    return {
      ...extraQuery,
      userId: req.userId
    };
  }

  try {
    const firmUsers = await User.find({ username: { $regex: FIRM_USERNAME_REGEX } }).select('_id');
    const firmUserIds = firmUsers.map((user) => user._id);

    return {
      ...extraQuery,
      userId: { $in: firmUserIds.length > 0 ? firmUserIds : [req.userId] }
    };
  } catch (err) {
    return {
      ...extraQuery,
      userId: req.userId
    };
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req);
    const accounts = await Account.find(scopeQuery).sort({ createdAt: -1 });
    return res.json(accounts);
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching accounts', error: err.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { handler, accountName, password, isActive } = req.body;

    const safeHandler = String(handler || '').trim();
    const safeAccountName = String(accountName || '').trim();
    const safePassword = String(password || '').trim();

    if (!safeHandler || !safeAccountName || !safePassword) {
      return res.status(400).json({ message: 'handler, accountName, and password are required' });
    }

    const account = await Account.create({
      userId: req.userId,
      handler: safeHandler,
      accountName: safeAccountName,
      password: safePassword,
      isActive: typeof isActive === 'boolean' ? isActive : true
    });

    req.app.get('io').emit('realtime-update', {
      action: 'added a new account',
      user: req.username,
      module: 'Accounts'
    });

    return res.status(201).json(account);
  } catch (err) {
    return res.status(500).json({ message: 'Error creating account', error: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { handler, accountName, password, isActive } = req.body;
    const scopeQuery = await buildScopeQuery(req, { _id: req.params.id });

    const existing = await Account.findOne(scopeQuery);
    if (!existing) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const safeHandler = String(handler || existing.handler).trim();
    const safeAccountName = String(accountName || existing.accountName).trim();
    const safePassword = String(password || existing.password).trim();

    if (!safeHandler || !safeAccountName || !safePassword) {
      return res.status(400).json({ message: 'handler, accountName, and password are required' });
    }

    const updated = await Account.findOneAndUpdate(
      scopeQuery,
      {
        handler: safeHandler,
        accountName: safeAccountName,
        password: safePassword,
        ...(typeof isActive === 'boolean' ? { isActive } : {})
      },
      { new: true }
    );

    req.app.get('io').emit('realtime-update', {
      action: 'updated an account',
      user: req.username,
      module: 'Accounts'
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating account', error: err.message });
  }
});

router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const scopeQuery = await buildScopeQuery(req, { _id: req.params.id });
    const updated = await Account.findOneAndUpdate(scopeQuery, { isActive }, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Account not found' });
    }

    req.app.get('io').emit('realtime-update', {
      action: isActive ? 'activated an account' : 'deactivated an account',
      user: req.username,
      module: 'Accounts'
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating account status', error: err.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req, { _id: req.params.id });
    const deleted = await Account.findOneAndDelete(scopeQuery);

    if (!deleted) {
      return res.status(404).json({ message: 'Account not found' });
    }

    req.app.get('io').emit('realtime-update', {
      action: 'deleted an account',
      user: req.username,
      module: 'Accounts'
    });

    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting account', error: err.message });
  }
});

module.exports = router;