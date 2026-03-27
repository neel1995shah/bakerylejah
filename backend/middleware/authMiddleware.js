import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const adminRoles = ['owner', 'sub_manager', 'manager', 'admin', 'submanager'];

const normalizeRole = (role) => String(role || '').toLowerCase().replace(/[\s-]+/g, '_');

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = await User.findById(decoded.id).select('-pin');

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const managerOnly = (req, res, next) => {
  if (req.user && adminRoles.includes(normalizeRole(req.user.role))) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin role' });
  }
};

export const workerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'worker') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as worker' });
  }
};