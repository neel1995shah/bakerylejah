import Inventory from '../models/Inventory.js';
import { io } from '../index.js';

export const getInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find({}).populate('product');
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateStock = async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    const inventory = await Inventory.findByIdAndUpdate(
      id,
      { quantity, lastRestocked: Date.now() },
      { new: true }
    ).populate('product');

    if (!inventory) return res.status(404).json({ message: 'Inventory record not found' });

    // Instantly notify clients about the stock update
    io.emit('stockUpdated', inventory);
    
    res.json(inventory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};