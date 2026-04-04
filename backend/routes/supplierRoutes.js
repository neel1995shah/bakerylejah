import express from 'express';
import { getSuppliers, createSupplier, deleteSupplier, getSupplierById, getSupplierLedger, addSupplierLedgerEntry } from '../controllers/supplierController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getSuppliers);
router.post('/', protect, managerOnly, createSupplier);

router.get('/:id/ledger', protect, getSupplierLedger);
router.post('/:id/ledger', protect, addSupplierLedgerEntry);

router.get('/:id', protect, getSupplierById);
router.delete('/:id', protect, managerOnly, deleteSupplier);

export default router;
