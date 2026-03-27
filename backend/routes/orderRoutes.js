import express from 'express';
import { createOrder, getOrders, assignWorker, updateDeliveryStatus } from '../controllers/orderController.js';
import { protect, managerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getOrders)
  .post(protect, managerOnly, createOrder);

router.route('/:id/assign')
  .put(protect, managerOnly, assignWorker);

router.route('/:id/status')
  .put(protect, workerOnly, updateDeliveryStatus);

export default router;