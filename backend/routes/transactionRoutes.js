import express from 'express';
import { getTransactions, addTransaction } from '../controllers/transactionController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/:entityType/:entityId')
  .get(protect, getTransactions)
  .post(protect, managerOnly, addTransaction);

export default router;
