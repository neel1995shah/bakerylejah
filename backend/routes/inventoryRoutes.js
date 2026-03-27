import express from 'express';
import { getInventory, updateStock } from '../controllers/inventoryController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getInventory);

router.route('/:id')
  .put(protect, managerOnly, updateStock);

export default router;