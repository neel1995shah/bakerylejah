import express from 'express';
import { getSuppliers, createSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, managerOnly, createSupplier);

router.route('/:id')
  .delete(protect, managerOnly, deleteSupplier);

export default router;
