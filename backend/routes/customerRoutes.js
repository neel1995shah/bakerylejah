import express from 'express';
import { getCustomers, createCustomer, deleteCustomer, getCustomerLedger, addLedgerEntry, getCustomerById } from '../controllers/customerController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[ROUTER TRACE] ${req.method} ${req.url}`);
  next();
});

// Specific routes first
router.get('/:id/ledger', protect, getCustomerLedger);
router.post('/:id/ledger', protect, addLedgerEntry);

// Generic routes later
router.get('/:id', protect, getCustomerById);
router.delete('/:id', protect, managerOnly, deleteCustomer);

router.get('/', protect, getCustomers);
router.post('/', protect, managerOnly, createCustomer);

export default router;