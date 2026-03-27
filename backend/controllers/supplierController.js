import Supplier from '../models/Supplier.js';
import Transaction from '../models/Transaction.js';

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, address, initialAmount, initialType } = req.body;

    const amount = Number(initialAmount) || 0;
    let dues = 0;
    if (amount > 0 && initialType) {
      dues = initialType === 'you_got' ? amount : -amount;
    }

    const supplier = new Supplier({ name, phone, address, dues });
    const savedSupplier = await supplier.save();

    if (amount > 0 && initialType) {
      await new Transaction({
        entityType: 'supplier',
        entityId: savedSupplier._id,
        type: initialType,
        amount,
        note: 'Opening balance',
        balanceAfter: dues
      }).save();
    }

    res.status(201).json(savedSupplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await supplier.deleteOne();
    return res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
