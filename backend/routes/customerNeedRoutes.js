import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { createCustomerNeed, getCustomerNeeds, markCustomerNeedDone } from '../controllers/customerNeedController.js';

const router = express.Router();

router.route('/')
  .get(protect, getCustomerNeeds)
  .post(protect, createCustomerNeed);

router.put('/:id/done', protect, markCustomerNeedDone);

export default router;
