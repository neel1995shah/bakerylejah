import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createStockAlert, getStockAlerts, completeStockAlert } from '../controllers/stockAlertController.js';

const router = express.Router();

router.route('/')
  .get(protect, getStockAlerts)
  .post(protect, createStockAlert);

router.put('/:id/complete', protect, completeStockAlert);

export default router;
