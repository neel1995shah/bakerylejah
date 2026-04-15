const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const activeUsers = new Map();

// Configure CORS with multiple frontend URLs
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(','),
  'http://localhost:3000',
  'http://localhost:5173'
]
  .map((url) => (url || '').trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

const io = new Server(server, {
  cors: corsOptions
});
app.set('io', io);
io.activeUsers = activeUsers;

io.on('connection', (socket) => {
  socket.on('register-user', (username) => {
    const key = String(username || '').toLowerCase().trim();
    if (!key) {
      return;
    }

    const currentCount = activeUsers.get(key) || 0;
    activeUsers.set(key, currentCount + 1);
    socket.data.username = key;
  });

  socket.on('unregister-user', (username) => {
    const key = String(username || socket.data.username || '').toLowerCase().trim();
    if (!key || !activeUsers.has(key)) {
      return;
    }

    const nextCount = (activeUsers.get(key) || 1) - 1;
    if (nextCount > 0) {
      activeUsers.set(key, nextCount);
    } else {
      activeUsers.delete(key);
    }
  });

  socket.on('disconnect', () => {
    const key = socket.data.username;
    if (!key || !activeUsers.has(key)) {
      return;
    }

    const nextCount = (activeUsers.get(key) || 1) - 1;
    if (nextCount > 0) {
      activeUsers.set(key, nextCount);
    } else {
      activeUsers.delete(key);
    }
  });
});

// Middleware
app.use(cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/pl-entries', require('./routes/plEntries'));
app.use('/api/ledger-entries', require('./routes/ledgerEntries'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/push', require('./routes/push'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
