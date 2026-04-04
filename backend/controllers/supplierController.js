import Supplier from '../models/Supplier.js';
import Ledger from '../models/Ledger.js';

export const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, address, dues } = req.body;
    const initialDues = Number(dues || 0);

    const supplier = new Supplier({ name, phone, address, dues: initialDues });
    const savedSupplier = await supplier.save();

    if (initialDues > 0) {
      await Ledger.create({
        supplier: savedSupplier._id,
        amount: initialDues,
        type: 'gave',
        note: 'Opening Balance',
        runningBalance: initialDues
      });
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

export const getSupplierLedger = async (req, res) => {
  try {
    const { id } = req.params;
    let ledger = await Ledger.find({ supplier: id }).sort({ createdAt: -1 });
    
    // Virtual Opening Balance if no entries but dues exist
    if (ledger.length === 0) {
      const supplier = await Supplier.findById(id);
      if (supplier && supplier.dues > 0) {
        ledger = [{
          _id: 'virtual-opening',
          supplier: id,
          amount: supplier.dues,
          type: 'gave',
          note: 'Opening Balance',
          runningBalance: supplier.dues,
          createdAt: supplier.createdAt
        }];
      }
    }

    res.json(ledger);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addSupplierLedgerEntry = async (req, res) => {
  const { amount, type, note } = req.body;
  const { id } = req.params;

  try {
    const supplier = await Supplier.findById(id);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

    // Note: For suppliers, 'gave' (you paid them) decreases your debt, 'got' (they gave stock) increases it.
    const change = type === 'got' ? amount : -amount;
    supplier.dues = (supplier.dues || 0) + change;
    await supplier.save();

    const entry = await Ledger.create({
      supplier: id,
      amount,
      type,
      note,
      runningBalance: supplier.dues
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
