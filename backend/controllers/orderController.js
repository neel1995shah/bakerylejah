import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';
import { io } from '../index.js';

export const createOrder = async (req, res) => {
  const { customerId, customerData, items = [], totalAmount } = req.body;

  try {
    let resolvedCustomerId = customerId;

    if (!resolvedCustomerId && customerData) {
      const name = customerData.name?.trim();
      const phone = customerData.phone?.trim();
      const address = customerData.address?.trim();

      if (!name || !phone || !address) {
        return res.status(400).json({ message: 'Customer name, phone, and address are required' });
      }

      let customer = await Customer.findOne({ phone });
      if (!customer) {
        customer = await Customer.create({ name, phone, address });
      } else {
        customer.name = name;
        customer.address = address;
        await customer.save();
      }

      resolvedCustomerId = customer._id;
    }

    if (!resolvedCustomerId) {
      return res.status(400).json({ message: 'Customer information is required' });
    }

    const normalizedItems = items.map((item) => ({
      product: item.product || undefined,
      productName: item.productName || '',
      quantity: item.quantity,
      price: item.price,
      unitType: item.unitType || 'qty',
      note: item.note || ''
    }));

    const order = new Order({
      customer: resolvedCustomerId,
      items: normalizedItems,
      totalAmount,
      deliveryStatus: 'pending'
    });

    const createdOrder = await order.save();
    
    const customer = await Customer.findByIdAndUpdate(
      resolvedCustomerId, 
      { $inc: { dues: totalAmount } },
      { new: true }
    );

    // Create a transaction entry for the "GAVE" (Credit sale)
    await Transaction.create({
      entityType: 'customer',
      entityId: customer._id,
      amount: totalAmount,
      type: 'you_gave',
      balanceAfter: customer.dues,
      note: `Order #${createdOrder._id.toString().slice(-6).toUpperCase()}`
    });


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
      // Auto-delete delivered item as requested
      await Order.findByIdAndDelete(id);
      io.to('manager').emit('orderDeleted', id);
      io.to('worker').emit('orderDeleted', id);
      io.to('owner').emit('orderDeleted', id);
      io.to('sub_manager').emit('orderDeleted', id);
      
      // Still emit deliveryCompleted for any final notifications
      io.to('manager').emit('deliveryCompleted', order);
      io.to('worker').emit('deliveryCompleted', order);
    }


    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const confirmOrder = async (req, res) => {
  const { id } = req.params;
  const { workerId, deliveryOption } = req.body;
  const isBySelf = deliveryOption === 'by_self';

  try {
    const updatePayload = {
      deliveryStatus: 'assigned',
      confirmedBy: req.user._id,
      confirmedAt: Date.now(),
      assignedBySelf: isBySelf
    };

    if (isBySelf) {
      updatePayload.assignedWorker = null;
    } else {
      if (!workerId) {
        return res.status(400).json({ message: 'Worker is required for confirmation' });
      }
      updatePayload.assignedWorker = workerId;
    }

    const order = await Order.findByIdAndUpdate(id, updatePayload, { new: true })
      .populate('customer')
      .populate('assignedWorker')
      .populate('items.product')
      .populate('confirmedBy', 'username name role');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    io.to('owner').emit('orderConfirmed', order);
    io.to('sub_manager').emit('orderConfirmed', order);
    io.to('manager').emit('orderConfirmed', order);
    io.to('worker').emit('workerAssigned', order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const cancelOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      {
        deliveryStatus: 'cancelled',
        cancelledBy: req.user._id,
        cancelledAt: Date.now()
      },
      { new: true }
    )
      .populate('customer')
      .populate('assignedWorker')
      .populate('items.product')
      .populate('cancelledBy', 'username name role');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    io.to('owner').emit('orderCancelled', order);
    io.to('sub_manager').emit('orderCancelled', order);
    io.to('manager').emit('orderCancelled', order);
    io.to('worker').emit('orderCancelled', order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const raiseOrderIssue = async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(
      id,
      {
        deliveryStatus: 'issue',
        issueRaisedBy: req.user._id,
        issueRaisedAt: Date.now(),
        issueNote: note || ''
      },
      { new: true }
    )
      .populate('customer')
      .populate('assignedWorker')
      .populate('items.product')
      .populate('issueRaisedBy', 'username name role');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    io.to('owner').emit('orderIssueRaised', order);
    io.to('sub_manager').emit('orderIssueRaised', order);
    io.to('manager').emit('orderIssueRaised', order);

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};