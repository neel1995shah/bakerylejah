import express from 'express';
import { Order, Inventory, User } from '../models.js';
import { io } from '../index.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  const orders = await Order.find().populate('assignedWorker', 'username');
  const inventory = await Inventory.find();
  const workers = await User.find({ role: 'worker' }, 'username');
  res.json({ orders, inventory, workers });
});

router.post('/orders', async (req, res) => {
  const order = await Order.create(req.body);
  io.emit('orderCreated', order);
  res.json(order);
});

router.post('/inventory', async (req, res) => {
  const item = await Inventory.create(req.body);
  io.emit('inventoryUpdated', item);
  res.json(item);
});

router.post('/assign-worker', async (req, res) => {
  const { orderId, workerId } = req.body;
  const order = await Order.findByIdAndUpdate(orderId, { assignedWorker: workerId }, { new: true });
  io.emit('orderAssigned', order);
  res.json(order);
});

export default router;
