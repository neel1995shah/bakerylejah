const express = require('express');
const jwt = require('jsonwebtoken');
const PLEntry = require('../models/PLEntry');

const router = express.Router();
const FIRM_NAMES = ['krish', 'harsh', 'meet'];

const isFirmMember = (username) => FIRM_NAMES.includes((username || '').toLowerCase().trim());

const buildScopeQuery = (req, extraQuery = {}) => {
  if (isFirmMember(req.username)) {
    return {
      ...extraQuery,
      handler: { $in: FIRM_NAMES }
    };
  }

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const entries = await PLEntry.find(buildScopeQuery(req)).sort({ date: -1, createdAt: -1 });

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

    const entry = await PLEntry.create({
      userId: req.userId,
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

    req.app.get('io').emit('realtime-update', {
      action: 'added a new entry',
      user: req.username,
      module: 'P&L'
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

    const netProfit = safeOut - safeIn - safeCharges;

    const existingEntry = await PLEntry.findOne(buildScopeQuery(req, { _id: req.params.id }));

    if (!existingEntry) {
      return res.status(404).json({ message: 'P&L entry not found' });
    }

    if (existingEntry.settled) {
      return res.status(400).json({ message: 'Settled entries cannot be edited' });
    }

    const entry = await PLEntry.findOneAndUpdate(
      buildScopeQuery(req, { _id: req.params.id }),
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

    req.app.get('io').emit('realtime-update', {
      action: 'updated an entry',
      user: req.username,
      module: 'P&L'
    });

    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating P&L entry', error: err.message });
  }
});

router.put('/:id/settle', verifyToken, async (req, res) => {
  try {
    const entry = await PLEntry.findOne(buildScopeQuery(req, { _id: req.params.id }));

    if (!entry) {
      return res.status(404).json({ message: 'P&L entry not found' });
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
      module: 'P&L'
    });

    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: 'Error settling P&L entry', error: err.message });
  }
});

module.exports = router;
