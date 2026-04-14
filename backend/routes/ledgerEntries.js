const express = require('express');
const jwt = require('jsonwebtoken');
const LedgerEntry = require('../models/LedgerEntry');
const User = require('../models/User');

const router = express.Router();
const FIRM_NAMES = ['krish', 'harsh', 'harssh', 'meet'];
const FIRM_USERNAME_REGEX = new RegExp(`^(${FIRM_NAMES.join('|')})$`, 'i');

const normalizeName = (value) => (value || '').toLowerCase().trim();
const isFirmMember = (username) => FIRM_NAMES.includes(normalizeName(username));

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

const buildRunningEntries = (entries) => {
  let runningTotal = 0;
  return entries.map((entry) => {
    runningTotal = runningTotal + Number(entry.in || 0) - Number(entry.out || 0);
    return {
      ...entry.toObject(),
      total: runningTotal
    };
  });
};

const recalculateTotals = async (scopeQuery) => {
  const entries = await LedgerEntry.find(scopeQuery).sort({ date: 1, createdAt: 1 });
  let runningTotal = 0;

  for (const entry of entries) {
    runningTotal = runningTotal + Number(entry.in || 0) - Number(entry.out || 0);
    entry.total = runningTotal;
    await entry.save();
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req);
    const entries = await LedgerEntry.find(scopeQuery).sort({ date: 1, createdAt: 1 });
    const rows = buildRunningEntries(entries);
    res.json(rows.reverse());
  } catch (err) {
    res.status(500).json({ message: 'Error fetching ledger entries', error: err.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { date, name, in: amountIn, out: amountOut } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: 'date and name are required' });
    }

    const safeIn = Number(amountIn || 0);
    const safeOut = Number(amountOut || 0);

    if ([safeIn, safeOut].some((num) => Number.isNaN(num) || num < 0)) {
      return res.status(400).json({ message: 'in and out must be valid non-negative numbers' });
    }

    const scopeQuery = await buildScopeQuery(req);
    const lastEntry = await LedgerEntry.findOne(scopeQuery).sort({ date: -1, createdAt: -1 });
    const previousTotal = lastEntry ? Number(lastEntry.total || 0) : 0;
    const total = previousTotal + safeIn - safeOut;

    const entry = await LedgerEntry.create({
      userId: req.userId,
      date,
      name,
      in: safeIn,
      out: safeOut,
      settled: false,
      editCount: 0,
      settledAt: null,
      total
    });

    req.app.get('io').emit('realtime-update', {
      action: 'added a new entry',
      user: req.username,
      module: 'Ledger'
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Error creating ledger entry', error: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { date, name, in: amountIn, out: amountOut } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: 'date and name are required' });
    }

    const safeIn = Number(amountIn || 0);
    const safeOut = Number(amountOut || 0);

    if ([safeIn, safeOut].some((num) => Number.isNaN(num) || num < 0)) {
      return res.status(400).json({ message: 'in and out must be valid non-negative numbers' });
    }

    const scopedEntryQuery = await buildScopeQuery(req, { _id: req.params.id });
    const existingEntry = await LedgerEntry.findOne(scopedEntryQuery);

    if (!existingEntry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    if (existingEntry.settled) {
      return res.status(400).json({ message: 'Settled entries cannot be edited' });
    }

    if (Number(existingEntry.editCount || 0) >= 1) {
      return res.status(400).json({ message: 'This entry can only be edited once' });
    }

    const entry = await LedgerEntry.findOneAndUpdate(
      scopedEntryQuery,
      {
        date,
        name,
        in: safeIn,
        out: safeOut,
        editCount: Number(existingEntry.editCount || 0) + 1
      },
      { new: true }
    );

    const scopeQuery = await buildScopeQuery(req);
    await recalculateTotals(scopeQuery);
    const refreshed = await LedgerEntry.findOne(scopedEntryQuery);

    req.app.get('io').emit('realtime-update', {
      action: 'updated an entry',
      user: req.username,
      module: 'Ledger'
    });

    res.json(refreshed);
  } catch (err) {
    res.status(500).json({ message: 'Error updating ledger entry', error: err.message });
  }
});

router.put('/:id/settle', verifyToken, async (req, res) => {
  try {
    const scopedEntryQuery = await buildScopeQuery(req, { _id: req.params.id });
    const entry = await LedgerEntry.findOne(scopedEntryQuery);

    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    if (entry.settled) {
      return res.status(400).json({ message: 'Entry is already settled' });
    }

    entry.settled = true;
    entry.settledAt = new Date();
    await entry.save();

    req.app.get('io').emit('realtime-update', {
      action: 'settled an entry',
      user: req.username,
      module: 'Ledger'
    });

    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: 'Error settling ledger entry', error: err.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scopedEntryQuery = await buildScopeQuery(req, { _id: req.params.id });
    const entry = await LedgerEntry.findOne(scopedEntryQuery);

    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    if (entry.settled) {
      return res.status(400).json({ message: 'Settled entries cannot be deleted' });
    }

    await LedgerEntry.deleteOne({ _id: entry._id });
    const scopeQuery = await buildScopeQuery(req);
    await recalculateTotals(scopeQuery);

    req.app.get('io').emit('realtime-update', {
      action: 'deleted an entry',
      user: req.username,
      module: 'Ledger'
    });

    return res.json({ message: 'Ledger entry deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting ledger entry', error: err.message });
  }
});

module.exports = router;
