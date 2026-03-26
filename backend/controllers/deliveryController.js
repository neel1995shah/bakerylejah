import Delivery from '../models/Delivery.js';
import Order from '../models/Order.js';
import { io } from '../index.js';

export const assignDelivery = async (req, res) => {
  const { orderId, workerId } = req.body;

  try {
    const delivery = new Delivery({
      order: orderId,
      worker: workerId,
      status: 'pending'
    });

    const createdDelivery = await delivery.save();
    
    // Update order status if needed
    const order = await Order.findById(orderId);
    if (order) {
      order.status = 'processing';
      await order.save();
    }

    io.emit('deliveryAssigned', createdDelivery);
    res.status(201).json(createdDelivery);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateDeliveryStatus = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    
    if (delivery) {
      delivery.status = req.body.status || delivery.status;
      if (req.body.status === 'delivered') {
        delivery.deliveredDate = Date.now();
        
        const order = await Order.findById(delivery.order);
        if (order) {
          order.status = 'completed';
          await order.save();
        }
      }

      const updatedDelivery = await delivery.save();
      io.emit('deliveryUpdated', updatedDelivery);
      res.json(updatedDelivery);
    } else {
      res.status(404).json({ message: 'Delivery not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDeliveries = async (req, res) => {
  try {
    // If worker, only show their deliveries
    const filter = req.user.role === 'worker' ? { worker: req.user._id } : {};
    const deliveries = await Delivery.find(filter).populate('order').populate('worker', 'username');
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};