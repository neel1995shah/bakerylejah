const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const LedgerEntry = require('../models/LedgerEntry');
const { JWT_SECRET } = require('../config/jwt');
const { broadcastRealtimeNotification, buildNotificationBody } = require('../utils/realtimeNotifications');
const { applyEntryCodes, generateNextEntryCode } = require('../utils/entryCodes');

const router = express.Router();
const buildScopeQuery = (req, extraQuery = {}) => {
  return {
    ...extraQuery,
    userId: req.userId
  };
};

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

const formatLedgerField = (field) => {
  if (field === 'in') return 'in';
  if (field === 'out') return 'out';
  if (field === 'notes') return 'notes';
  return field;
};

const normalizeDateValue = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req);
    const entries = await LedgerEntry.find(scopeQuery).sort({ date: 1, createdAt: 1 });
    applyEntryCodes(entries);
    const rows = buildRunningEntries(entries);
    res.json(rows.reverse());
  } catch (err) {
    require('fs').appendFileSync(require('path').join(__dirname, '..', 'intercept.log'), 'GET error: ' + String(err.stack) + '\\n');
    console.error('Ledger Entries GET error:', err);
    res.status(500).json({ message: 'Error fetching ledger entries', error: err.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { date, name, in: amountIn, out: amountOut, notes } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: 'date and name are required' });
    }

    const safeIn = Number(amountIn || 0);
    const safeOut = Number(amountOut || 0);
    const safeNotes = String(notes || '').trim();

    if ([safeIn, safeOut].some((num) => Number.isNaN(num) || num < 0)) {
      return res.status(400).json({ message: 'in and out must be valid non-negative numbers' });
    }

    if (safeNotes.length > 500) {
      return res.status(400).json({ message: 'notes must be 500 characters or fewer' });
    }

    const scopeQuery = await buildScopeQuery(req);
    const lastEntry = await LedgerEntry.findOne(scopeQuery).sort({ date: -1, createdAt: -1 });
    const previousTotal = lastEntry ? Number(lastEntry.total || 0) : 0;
    const total = previousTotal + safeIn - safeOut;
    const entryCode = await generateNextEntryCode(LedgerEntry, date);

    const entry = await LedgerEntry.create({
      userId: req.userId,
      entryCode,
      date,
      name,
      in: safeIn,
      out: safeOut,
      notes: safeNotes,
      settled: false,
      editCount: 0,
      settledAt: null,
      total
    });

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'A',
      entryType: 'LED',
      user: req.username,
      entryCode: entryCode,
      detailedChanges: [
        {
          field: 'date',
          oldValue: '',
          newValue: new Date(entry.date).toLocaleDateString()
        },
        {
          field: 'name',
          oldValue: '',
          newValue: entry.name
        },
        {
          field: 'in',
          oldValue: '',
          newValue: entry.in
        },
        {
          field: 'out',
          oldValue: '',
          newValue: entry.out
        },
        {
          field: 'notes',
          oldValue: '',
          newValue: entry.notes || ''
        },
        {
          field: 'total',
          oldValue: '',
          newValue: entry.total
        }
      ]
    });

    res.status(201).json(entry);
  } catch (err) {
    require('fs').appendFileSync('intercept.log', 'POST error: ' + String(err.stack) + '\\n');
    res.status(500).json({ message: 'Error creating ledger entry', error: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { date, name, in: amountIn, out: amountOut, notes } = req.body;

    if (!date || !name) {
      return res.status(400).json({ message: 'date and name are required' });
    }

    const safeIn = Number(amountIn || 0);
    const safeOut = Number(amountOut || 0);
    const safeNotes = String(notes || '').trim();

    if ([safeIn, safeOut].some((num) => Number.isNaN(num) || num < 0)) {
      return res.status(400).json({ message: 'in and out must be valid non-negative numbers' });
    }

    if (safeNotes.length > 500) {
      return res.status(400).json({ message: 'notes must be 500 characters or fewer' });
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

    const changedFields = [];
    if (normalizeDateValue(date) !== normalizeDateValue(existingEntry.date)) {
      changedFields.push(formatLedgerField('date'));
    }
    if (name !== existingEntry.name) changedFields.push(formatLedgerField('name'));
    if (safeIn !== Number(existingEntry.in || 0)) changedFields.push(formatLedgerField('in'));
    if (safeOut !== Number(existingEntry.out || 0)) changedFields.push(formatLedgerField('out'));
    if (safeNotes !== String(existingEntry.notes || '')) changedFields.push(formatLedgerField('notes'));

    const detailedChanges = [];
    if (normalizeDateValue(date) !== normalizeDateValue(existingEntry.date)) {
      detailedChanges.push({
        field: 'date',
        oldValue: new Date(existingEntry.date).toLocaleDateString(),
        newValue: new Date(date).toLocaleDateString()
      });
    }
    if (name !== existingEntry.name) {
      detailedChanges.push({
        field: 'name',
        oldValue: existingEntry.name,
        newValue: name
      });
    }
    if (safeIn !== Number(existingEntry.in || 0)) {
      detailedChanges.push({
        field: 'in',
        oldValue: existingEntry.in,
        newValue: safeIn
      });
    }
    if (safeOut !== Number(existingEntry.out || 0)) {
      detailedChanges.push({
        field: 'out',
        oldValue: existingEntry.out,
        newValue: safeOut
      });
    }
    if (safeNotes !== String(existingEntry.notes || '')) {
      detailedChanges.push({
        field: 'notes',
        oldValue: existingEntry.notes || '',
        newValue: safeNotes
      });
    }

    const entry = await LedgerEntry.findOneAndUpdate(
      scopedEntryQuery,
      {
        date,
        name,
        in: safeIn,
        out: safeOut,
        notes: safeNotes,
        editCount: Number(existingEntry.editCount || 0) + 1
      },
      { new: true }
    );

    const scopeQuery = await buildScopeQuery(req);
    await recalculateTotals(scopeQuery);
    const refreshed = await LedgerEntry.findOne(scopedEntryQuery);

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'U',
      entryType: 'LED',
      user: req.username,
      entryCode: existingEntry.entryCode,
      detailedChanges: detailedChanges
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

    await broadcastRealtimeNotification(req.app.get('io'), {
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

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'D',
      entryType: 'LED',
      user: req.username,
      entryCode: entry.entryCode,
      detailedChanges: [
        {
          field: 'name',
          oldValue: entry.name,
          newValue: ''
        },
        {
          field: 'date',
          oldValue: new Date(entry.date).toLocaleDateString(),
          newValue: ''
        },
        {
          field: 'in',
          oldValue: entry.in,
          newValue: ''
        },
        {
          field: 'out',
          oldValue: entry.out,
          newValue: ''
        },
        {
          field: 'notes',
          oldValue: entry.notes || '',
          newValue: ''
        },
        {
          field: 'total',
          oldValue: entry.total,
          newValue: ''
        }
      ]
    });

    return res.json({ message: 'Ledger entry deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting ledger entry', error: err.message });
  }
});

module.exports = router;
