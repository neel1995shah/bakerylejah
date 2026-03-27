import Supplier from '../models/Supplier.js';

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
    const { name, phone, address } = req.body;
    const supplier = new Supplier({ name, phone, address });
    const savedSupplier = await supplier.save();
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
