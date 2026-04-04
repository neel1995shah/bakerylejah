import express from 'express';
import { getSuppliers, createSupplier, deleteSupplier, getSupplierById } from '../controllers/supplierController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id', protect, getSupplierById);
router.delete('/:id', protect, managerOnly, deleteSupplier);
router.get('/', protect, getSuppliers);
router.post('/', protect, managerOnly, createSupplier);

export default router;
