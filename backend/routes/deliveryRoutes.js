import express from 'express';
import { assignDelivery, updateDeliveryStatus, getDeliveries } from '../controllers/deliveryController.js';
import { protect, managerOnly, workerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getDeliveries)
  .post(protect, managerOnly, assignDelivery);

router.route('/:id/status')
  .put(protect, workerOnly, updateDeliveryStatus);

export default router;