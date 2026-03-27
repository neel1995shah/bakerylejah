import Customer from '../models/Customer.js';
import Transaction from '../models/Transaction.js';

export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, address, initialAmount, initialType } = req.body;

    const amount = Number(initialAmount) || 0;
    let dues = 0;
    if (amount > 0 && initialType) {
      dues = initialType === 'you_got' ? amount : -amount;
    }

    const customer = new Customer({ name, phone, address, dues });
    const savedCustomer = await customer.save();

    if (amount > 0 && initialType) {
      await new Transaction({
        entityType: 'customer',
        entityId: savedCustomer._id,
        type: initialType,
        amount,
        note: 'Opening balance',
        balanceAfter: dues
      }).save();
    }

    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.deleteOne();
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};