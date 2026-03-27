import express from 'express';
import { Order, Inventory } from '../models.js';
import { io } from '../index.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
router.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch (e) {
    res.status(401).send();
  }
});

router.get('/orders', async (req, res) => {
  const orders = await Order.find({ assignedWorker: req.user.id });
  res.json(orders);
});

router.post('/orders/:id/status', async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  io.emit('orderUpdated', order);
  res.json(order);
});

export default router;