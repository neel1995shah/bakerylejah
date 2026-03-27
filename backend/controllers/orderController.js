import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import { io } from '../index.js';

export const createOrder = async (req, res) => {
  const { customerId, items, totalAmount } = req.body;

  try {
    const order = new Order({
      customer: customerId,
      items,
      totalAmount,
      deliveryStatus: 'pending'
    });

    const createdOrder = await order.save();
    
    if (customerId) {
      await Customer.findByIdAndUpdate(customerId, { $inc: { dues: totalAmount } });
    }

    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('customer')
      .populate('assignedWorker')
      .populate('items.product');

    // Instantly notify workers of new order
    io.to('worker').emit('orderCreated', populatedOrder);
    io.to('manager').emit('orderCreated', populatedOrder);
    
    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('customer')
      .populate('assignedWorker')
      .populate('items.product');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignWorker = async (req, res) => {
  const { id } = req.params;
  const { workerId } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      id, 
      { assignedWorker: workerId, deliveryStatus: 'assigned' }, 
      { new: true }
    ).populate('customer').populate('assignedWorker').populate('items.product');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Notify users that worker is assigned
    io.to('manager').emit('workerAssigned', order);
    io.to('worker').emit('workerAssigned', order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      { deliveryStatus: status },
      { new: true }
    ).populate('customer').populate('assignedWorker').populate('items.product');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Real-time events for delivery stages
    if (status === 'in-transit') {
      io.to('manager').emit('deliveryStarted', order);
      io.to('worker').emit('deliveryStarted', order);
    } else if (status === 'delivered') {
      io.to('manager').emit('deliveryCompleted', order);
      io.to('worker').emit('deliveryCompleted', order);
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};