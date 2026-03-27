import express from 'express';
import { registerUser, authUser, getUsers } from '../controllers/authController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/users', protect, managerOnly, getUsers);

export default router;