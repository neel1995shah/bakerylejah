import express from 'express';
import { getCustomers, createCustomer, deleteCustomer } from '../controllers/customerController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, managerOnly, createCustomer);

router.route('/:id')
  .delete(protect, managerOnly, deleteCustomer);

export default router;