import CustomerNeed from '../models/CustomerNeed.js';
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

export const getCustomerNeeds = async (_req, res) => {
  try {
    const needs = await CustomerNeed.find({})
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username role')
      .populate('doneBy', 'username role');

    res.json(needs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomerNeed = async (req, res) => {
  const {
    requirement,
    customerName,
    customerPhone,
    customerAddress = '',
    imageUrls = [],
    imagePublicIds = []
  } = req.body;

  if (!requirement || !customerName || !customerPhone) {
    return res.status(400).json({ message: 'Requirement, customer name and phone are required' });
  }

  try {
    const created = await CustomerNeed.create({
      requirement: String(requirement).trim(),
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
      customerAddress: String(customerAddress || '').trim(),
      imageUrls: Array.isArray(imageUrls)
        ? imageUrls.filter((u) => typeof u === 'string' && u.trim()).map((u) => u.trim())
        : [],
      imagePublicIds: Array.isArray(imagePublicIds)
        ? imagePublicIds.filter((u) => typeof u === 'string' && u.trim()).map((u) => u.trim())
        : [],
      createdBy: req.user._id
    });

    const need = await CustomerNeed.findById(created._id)
      .populate('createdBy', 'username role')
      .populate('doneBy', 'username role');

    io.emit('customerNeedCreated', need);
    res.status(201).json(need);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const markCustomerNeedDone = async (req, res) => {
  try {
    const need = await CustomerNeed.findById(req.params.id);
    if (!need) {
      return res.status(404).json({ message: 'Customer need not found' });
    }

    const publicIds = Array.isArray(need.imagePublicIds) && need.imagePublicIds.length > 0
      ? need.imagePublicIds
      : (Array.isArray(need.imageUrls) ? need.imageUrls.map((url) => getPublicIdFromUrl(url)).filter(Boolean) : []);

    if (publicIds.length > 0) {
      await Promise.all(
        publicIds.map(async (publicId) => {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => null);
        })
      );
    }

    const payload = {
      ...need.toObject(),
      status: 'done',
      doneBy: {
        _id: req.user._id,
        username: req.user.username,
        role: req.user.role
      },
      doneAt: new Date().toISOString()
    };

    await CustomerNeed.findByIdAndDelete(need._id);

    io.emit('customerNeedDone', payload);
    res.json({ message: 'Customer need completed and removed', removedId: req.params.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
