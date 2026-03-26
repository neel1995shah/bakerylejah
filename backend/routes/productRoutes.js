import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getProducts)
  .post(protect, managerOnly, createProduct);

router.route('/:id')
  .put(protect, managerOnly, updateProduct)
  .delete(protect, managerOnly, deleteProduct);

export default router;