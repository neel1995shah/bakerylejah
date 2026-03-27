import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import connectDB from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
// We aren't actively using Delivery routes anymore because delivery status is part of Order.
// But we will add inventoryRoutes instead for real-time stock
import inventoryRoutes from './routes/inventoryRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import stockAlertRoutes from './routes/stockAlertRoutes.js';
import customerNeedRoutes from './routes/customerNeedRoutes.js';

import { initSockets } from './sockets/index.js';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

// Connect Database
connectDB();

const app = express();
const server = http.createServer(app);

// Init Socket.io
export const io = new Server(server, { 
  cors: { 
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
  } 
});
initSockets(io);

// Init Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/stock-alerts', stockAlertRoutes);
app.use('/api/customer-needs', customerNeedRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));