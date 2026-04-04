import Customer from '../models/Customer.js';
import Ledger from '../models/Ledger.js';

export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({});
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { name, phone, address, dues } = req.body;
    const initialDues = Number(dues || 0);
    
    const customer = new Customer({ name, phone, address, dues: initialDues });
    const savedCustomer = await customer.save();

    if (initialDues > 0) {
      await Ledger.create({
        customer: savedCustomer._id,
        amount: initialDues,
        type: 'gave',
        note: 'Opening Balance',
        runningBalance: initialDues
      });
    }

    res.status(201).json(savedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await customer.deleteOne();
    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCustomerLedger = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[LEDGER DEBUG] Fetching history for customer ID: ${id}`);
    
    if (!id || id === 'undefined') {
      console.error('[LEDGER DEBUG] Invalid ID provided');
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    let ledger = await Ledger.find({ customer: id }).sort({ createdAt: -1 });
    
    // Virtual Opening Balance if no entries but dues exist
    if (ledger.length === 0) {
      const customer = await Customer.findById(id);
      if (customer && customer.dues > 0) {
        ledger = [{
          _id: 'virtual-opening',
          customer: id,
          amount: customer.dues,
          type: 'gave',
          note: 'Opening Balance',
          runningBalance: customer.dues,
          createdAt: customer.createdAt
        }];
      }
    }

    console.log(`[LEDGER DEBUG] Success: Found ${ledger.length} entries`);
    res.json(ledger);
  } catch (error) {
    console.error(`[LEDGER DEBUG] Fatal Error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

export const addLedgerEntry = async (req, res) => {
  const { amount, type, note } = req.body;
  const { id } = req.params;

  try {
    const customer = await Customer.findById(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // 'gave' increases dues (credit sale), 'got' decreases dues (payment received)
    const change = type === 'gave' ? amount : -amount;
    customer.dues = Math.max(0, (customer.dues || 0) + change);
    await customer.save();

    const entry = await Ledger.create({
      customer: id,
      amount,
      type,
      note,
      runningBalance: customer.dues
    });

    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
