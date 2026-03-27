import StockAlert from '../models/StockAlert.js';
import cloudinary from '../config/cloudinary.js';
import { io } from '../index.js';

const getPublicIdFromUrl = (url) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const uploadIdx = segments.findIndex((part) => part === 'upload');
    if (uploadIdx === -1) return null;

    let publicIdParts = segments.slice(uploadIdx + 1);
    if (publicIdParts[0] && /^v\d+$/.test(publicIdParts[0])) {
      publicIdParts = publicIdParts.slice(1);
    }
    if (publicIdParts.length === 0) return null;

    const last = publicIdParts[publicIdParts.length - 1];
    publicIdParts[publicIdParts.length - 1] = last.replace(/\.[^/.]+$/, '');
    return publicIdParts.join('/');
  } catch {
    return null;
  }
};

export const getStockAlerts = async (_req, res) => {
  try {
    const alerts = await StockAlert.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username role')
      .populate('completedBy', 'username role');

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStockAlert = async (req, res) => {
  const { itemName, note = '', priority = 'medium', imageUrl = '', imagePublicId = '' } = req.body;

  if (!itemName || !String(itemName).trim()) {
    return res.status(400).json({ message: 'Item name is required' });
  }

  try {
    const alert = await StockAlert.create({
      itemName: String(itemName).trim(),
      note: String(note || '').trim(),
      imageUrl: String(imageUrl || '').trim(),
      imagePublicId: String(imagePublicId || '').trim(),
      priority,
      createdBy: req.user._id
    });

    const populated = await StockAlert.findById(alert._id)
      .populate('createdBy', 'username role')
      .populate('completedBy', 'username role');

    io.emit('stockAlertCreated', populated);
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const completeStockAlert = async (req, res) => {
  try {
    const alert = await StockAlert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Stock alert not found' });
    }

    const publicId = alert.imagePublicId || getPublicIdFromUrl(alert.imageUrl || '');
    if (publicId) {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => null);
    }

    const payload = {
      ...alert.toObject(),
      status: 'completed',
      completedBy: {
        _id: req.user._id,
        username: req.user.username,
        role: req.user.role
      },
      completedAt: new Date().toISOString()
    };

    await StockAlert.findByIdAndDelete(alert._id);

    io.emit('stockAlertCompleted', payload);
    res.json({ message: 'Stock alert completed and removed', removedId: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
