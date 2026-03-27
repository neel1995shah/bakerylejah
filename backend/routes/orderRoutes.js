import express from 'express';
import {
  createOrder,
  getOrders,
  assignWorker,
  updateDeliveryStatus,
  confirmOrder,
  cancelOrder,
  raiseOrderIssue
} from '../controllers/orderController.js';
import { protect, managerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getOrders)
  .post(protect, managerOnly, createOrder);

router.route('/:id/assign')
  .put(protect, managerOnly, assignWorker);

router.route('/:id/confirm')
  .put(protect, managerOnly, confirmOrder);

router.route('/:id/cancel')
  .put(protect, managerOnly, cancelOrder);

router.route('/:id/issue')
  .put(protect, managerOnly, raiseOrderIssue);

router.route('/:id/status')
  .put(protect, workerOnly, updateDeliveryStatus);

export default router;