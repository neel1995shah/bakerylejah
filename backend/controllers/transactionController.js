import Transaction from '../models/Transaction.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';

const getModel = (entityType) => {
  if (entityType === 'customer') return Customer;
  if (entityType === 'supplier') return Supplier;
  return null;
};

export const getTransactions = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const Model = getModel(entityType);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const entity = await Model.findById(entityId);
    if (!entity) {
      return res.status(404).json({ message: `${entityType} not found` });
    }

    const transactions = await Transaction.find({
      entityType,
      entityId
    }).sort({ createdAt: -1 });

    return res.json({
      entity,
      transactions
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const addTransaction = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { type, amount, note } = req.body;

    if (!['you_gave', 'you_got'].includes(type)) {
      return res.status(400).json({ message: 'Type must be you_gave or you_got' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const Model = getModel(entityType);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid entity type' });
    }

    const entity = await Model.findById(entityId);
    if (!entity) {
      return res.status(404).json({ message: `${entityType} not found` });
    }

    // you_got = customer owes more (dues increase)
    // you_gave = owner paid (dues decrease)
    const delta = type === 'you_got' ? amount : -amount;
    const newDues = (entity.dues || 0) + delta;

    entity.dues = newDues;
    await entity.save();

    const transaction = new Transaction({
      entityType,
      entityId,
      type,
      amount,
      note: note || '',
      balanceAfter: newDues
    });

    const savedTransaction = await transaction.save();

    return res.status(201).json({
      transaction: savedTransaction,
      entity
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
