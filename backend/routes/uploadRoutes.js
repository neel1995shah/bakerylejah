import express from 'express';
import multer from 'multer';
import { uploadImage } from '../controllers/uploadController.js';
import { protect, managerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/image', protect, managerOnly, upload.single('image'), uploadImage);

export default router;
