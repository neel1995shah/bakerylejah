const express = require('express');
const jwt = require('jsonwebtoken');
const PLEntry = require('../models/PLEntry');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');
const { broadcastRealtimeNotification, buildNotificationBody } = require('../utils/realtimeNotifications');
const { applyEntryCodes, generateNextEntryCode } = require('../utils/entryCodes');

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

const formatPLField = (field) => {
  if (field === 'in') return 'in';
  if (field === 'out') return 'out';
  if (field === 'acc') return 'account';
  return field;
};

const normalizeDateValue = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
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

router.get('/', verifyToken, async (req, res) => {
  try {
    const scopeQuery = await buildScopeQuery(req);
    const entries = await PLEntry.find(scopeQuery).sort({ date: -1, createdAt: -1 });
    applyEntryCodes(entries);

    const totals = entries.reduce(
      (acc, row) => {
        acc.totalIn += row.in;
        acc.totalOut += row.out;
        acc.totalCharges += row.charges;
        acc.totalNetProfit += row.netProfit;
        return acc;
      },
      { totalIn: 0, totalOut: 0, totalCharges: 0, totalNetProfit: 0 }
    );

    return res.json({ entries, totals });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching P&L entries', error: err.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const { date, handler, acc, in: amountIn, out, charges } = req.body;

    if (!date || !handler || !acc) {
      return res.status(400).json({ message: 'date, handler, and acc are required' });
    }

    const safeIn = Number(amountIn || 0);
    const safeOut = Number(out || 0);
    const safeCharges = Number(charges || 0);

    if ([safeIn, safeOut, safeCharges].some((num) => Number.isNaN(num) || num < 0)) {
      return res.status(400).json({ message: 'in, out, and charges must be valid non-negative numbers' });
    }

    const netProfit = safeOut - safeIn - safeCharges;

    const entryCode = await generateNextEntryCode(PLEntry, date);

    const entry = await PLEntry.create({
      userId: req.userId,
      entryCode,
      date,
      handler,
      acc,
      in: safeIn,
      out: safeOut,
      charges: safeCharges,
      settled: false,
      settledAt: null,
      netProfit
    });

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'A',
      entryType: 'P&L',
      user: req.username,
      entryCode: entryCode,
      detailedChanges: [
        {
          field: 'date',
          oldValue: '',
          newValue: new Date(entry.date).toLocaleDateString()
        },
        {
          field: 'handler',
          oldValue: '',
          newValue: entry.handler
        },
        {
          field: 'account',
          oldValue: '',
          newValue: entry.acc
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
          field: 'charges',
          oldValue: '',
          newValue: entry.charges
        },
        {
          field: 'net profit',
          oldValue: '',
          newValue: entry.netProfit
        }
      ]
    });

    return res.status(201).json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Error creating P&L entry', error: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { date, handler, acc, in: amountIn, out, charges } = req.body;

    if (!date || !handler || !acc) {
      return res.status(400).json({ message: 'date, handler, and acc are required' });
    }

    const safeIn = Number(amountIn || 0);
    const safeOut = Number(out || 0);
    const safeCharges = Number(charges || 0);

    if ([safeIn, safeOut, safeCharges].some((num) => Number.isNaN(num) || num < 0)) {
      return res.status(400).json({ message: 'in, out, and charges must be valid non-negative numbers' });
    }

    const entryCode = await generateNextEntryCode(PLEntry, date);
    const netProfit = safeOut - safeIn - safeCharges;

    const scopedEntryQuery = await buildScopeQuery(req, { _id: req.params.id });
    const existingEntry = await PLEntry.findOne(scopedEntryQuery);

    if (!existingEntry) {
      return res.status(404).json({ message: 'P&L entry not found' });
    }

    if (existingEntry.settled) {
      return res.status(400).json({ message: 'Settled entries cannot be edited' });
    }

    const changedFields = [];
    if (normalizeDateValue(date) !== normalizeDateValue(existingEntry.date)) changedFields.push(formatPLField('date'));
    if (handler !== existingEntry.handler) changedFields.push(formatPLField('handler'));
    if (acc !== existingEntry.acc) changedFields.push(formatPLField('acc'));
    if (safeIn !== Number(existingEntry.in || 0)) changedFields.push(formatPLField('in'));
    if (safeOut !== Number(existingEntry.out || 0)) changedFields.push(formatPLField('out'));
    if (safeCharges !== Number(existingEntry.charges || 0)) changedFields.push(formatPLField('charges'));

    const detailedChanges = [];
    if (normalizeDateValue(date) !== normalizeDateValue(existingEntry.date)) {
      detailedChanges.push({
        field: 'date',
        oldValue: new Date(existingEntry.date).toLocaleDateString(),
        newValue: new Date(date).toLocaleDateString()
      });
    }
    if (handler !== existingEntry.handler) {
      detailedChanges.push({
        field: 'handler',
        oldValue: existingEntry.handler,
        newValue: handler
      });
    }
    if (acc !== existingEntry.acc) {
      detailedChanges.push({
        field: 'account',
        oldValue: existingEntry.acc,
        newValue: acc
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
    if (safeCharges !== Number(existingEntry.charges || 0)) {
      detailedChanges.push({
        field: 'charges',
        oldValue: existingEntry.charges,
        newValue: safeCharges
      });
    }

    const entry = await PLEntry.findOneAndUpdate(
      scopedEntryQuery,
      {
        date,
        handler,
        acc,
        in: safeIn,
        out: safeOut,
        charges: safeCharges,
        netProfit
      },
      { new: true }
    );

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'U',
      entryType: 'P&L',
      user: req.username,
      entryCode: existingEntry.entryCode,
      detailedChanges: detailedChanges
    });

    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating P&L entry', error: err.message });
  }
});

router.put('/:id/settle', verifyToken, async (req, res) => {
  try {
    const scopedEntryQuery = await buildScopeQuery(req, { _id: req.params.id });
    const entry = await PLEntry.findOne(scopedEntryQuery);

    if (!entry) {
      return res.status(404).json({ message: 'P&L entry not found' });
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
      module: 'P&L'
    });

    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Error settling P&L entry', error: err.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scopedEntryQuery = await buildScopeQuery(req, { _id: req.params.id });
    const entry = await PLEntry.findOne(scopedEntryQuery);

    if (!entry) {
      return res.status(404).json({ message: 'P&L entry not found' });
    }

    if (entry.settled) {
      return res.status(400).json({ message: 'Settled entries cannot be deleted' });
    }

    await PLEntry.deleteOne({ _id: entry._id });

    await broadcastRealtimeNotification(req.app.get('io'), {
      actionType: 'D',
      entryType: 'P&L',
      user: req.username,
      entryCode: entry.entryCode,
      detailedChanges: [
        {
          field: 'handler',
          oldValue: entry.handler,
          newValue: ''
        },
        {
          field: 'date',
          oldValue: new Date(entry.date).toLocaleDateString(),
          newValue: ''
        },
        {
          field: 'account',
          oldValue: entry.acc,
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
          field: 'charges',
          oldValue: entry.charges,
          newValue: ''
        },
        {
          field: 'net profit',
          oldValue: entry.netProfit,
          newValue: ''
        }
      ]
    });

    return res.json({ message: 'P&L entry deleted successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting P&L entry', error: err.message });
  }
});

module.exports = router;
