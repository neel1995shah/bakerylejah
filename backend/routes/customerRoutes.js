import express from 'express';
import { getCustomers, createCustomer, deleteCustomer, getCustomerById } from '../controllers/customerController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Trace middleware
router.use((req, res, next) => {
  console.log(`[ROUTER TRACE] ${req.method} ${req.url}`);
  next();
});

// Routes
router.get('/:id', protect, getCustomerById);
router.delete('/:id', protect, managerOnly, deleteCustomer);
router.get('/', protect, getCustomers);
router.post('/', protect, managerOnly, createCustomer);

export default router;