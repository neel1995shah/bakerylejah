const express = require('express');
const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const { JWT_SECRET } = require('../config/jwt');
const { broadcastRealtimeNotification, buildNotificationBody } = require('../utils/realtimeNotifications');

const router = express.Router();
const formatAccountField = (field) => {
  if (field === 'accountName') return 'account name';
  if (field === 'isActive') return 'status';
  return field;
};

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
  } catch (err) {
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

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'A',
      entryType: 'ACC',
      user: req.username,
      entryCode: '',
      detailedChanges: [
        {
          field: 'handler',
          oldValue: '',
          newValue: account.handler
        },
        {
          field: 'account name',
          oldValue: '',
          newValue: account.accountName
        },
        {
          field: 'password',
          oldValue: '',
          newValue: account.password
        },
        {
          field: 'status',
          oldValue: '',
          newValue: account.isActive ? 'active' : 'inactive'
        }
      ]
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

    const changedFields = [];
    if (safeHandler !== existing.handler) changedFields.push(formatAccountField('handler'));
    if (safeAccountName !== existing.accountName) changedFields.push(formatAccountField('accountName'));
    if (safePassword !== existing.password) changedFields.push(formatAccountField('password'));
    if (typeof isActive === 'boolean' && isActive !== existing.isActive) changedFields.push(formatAccountField('isActive'));

    const detailedChanges = [];
    if (safeHandler !== existing.handler) {
      detailedChanges.push({
        field: 'handler',
        oldValue: existing.handler,
        newValue: safeHandler
      });
    }
    if (safeAccountName !== existing.accountName) {
      detailedChanges.push({
        field: 'account name',
        oldValue: existing.accountName,
        newValue: safeAccountName
      });
    }
    if (safePassword !== existing.password) {
      detailedChanges.push({
        field: 'password',
        oldValue: existing.password,
        newValue: safePassword
      });
    }
    if (typeof isActive === 'boolean' && isActive !== existing.isActive) {
      detailedChanges.push({
        field: 'status',
        oldValue: existing.isActive ? 'active' : 'inactive',
        newValue: isActive ? 'active' : 'inactive'
      });
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

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'U',
      entryType: 'ACC',
      user: req.username,
      entryCode: '',
      detailedChanges: detailedChanges
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

    await broadcastRealtimeNotification(req.app.get('io'), {
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

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'D',
      entryType: 'ACC',
      user: req.username,
      entryCode: '',
      detailedChanges: [
        {
          field: 'handler',
          oldValue: deleted.handler,
          newValue: ''
        },
        {
          field: 'account name',
          oldValue: deleted.accountName,
          newValue: ''
        },
        {
          field: 'password',
          oldValue: deleted.password,
          newValue: ''
        },
        {
          field: 'status',
          oldValue: deleted.isActive ? 'active' : 'inactive',
          newValue: ''
        }
      ]
    });

    return res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting account', error: err.message });
  }
});

module.exports = router;