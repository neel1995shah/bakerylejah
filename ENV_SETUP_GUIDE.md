# Environment Configuration Guide

## ✅ What's Been Wired Up

### Backend (.env)

```
PORT=5003
MONGO_URI=mongodb+srv://everywheremail60_db_user:LRIGyUZRUpiFqXe6@rmanage.jlxcjls.mongodb.net/?appName=Rmanage
JWT_SECRET=your_super_secret_jwt_key_change_in_production
FRONTEND_URL=http://localhost:5173
FRONTEND_URLS=http://localhost:5173,https://bakerylejah.vercel.app
```

**Features:**

- ✅ MongoDB Atlas connection configured
- ✅ CORS enabled for both local development and production URLs
- ✅ JWT authentication ready
- ✅ Flexible frontend URL support

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:5003
```

**Features:**

- ✅ Centralized API configuration
- ✅ Environment-aware API calls
- ✅ Automatic token injection in all requests
- ✅ Unified error handling

### Frontend Production (.env.production)

```
REACT_APP_API_URL=https://bakery-backend.vercel.app
```

---

## 🚀 Getting Started

### 1. Start Backend

```bash
cd backend
npm start
```

Expected output:

```
MongoDB connected
Server running on port 5003
```

### 2. Start Frontend

```bash
cd frontend
npm start
```

Opens at `http://localhost:5173` or `http://localhost:3000`

### 3. Test the Connection

The frontend will automatically connect to the backend using the configured API URL.

---

## 🔒 Security Notes

⚠️ **IMPORTANT:** The JWT_SECRET is currently visible in the code. For production:

1. Generate a strong JWT secret:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Update in `.env`:

   ```
   JWT_SECRET=your-generated-secret-here
   ```

3. Store securely in your deployment environment (Vercel, Railway, etc.)

---

## 📱 Frontend Features

### API Configuration (src/config/api.js)

- **Auto-token injection:** Token from localStorage is automatically added to all API requests
- **Error handling:** 401 errors automatically log out the user
- **Base URL:** Uses `REACT_APP_API_URL` environment variable
- **Interceptors:** Request and response interceptors for consistent API handling

### Updated Pages

- ✅ **Login.js** - Uses apiClient for authentication
- ✅ **PAndL.js** - Uses apiClient for P&L data
- ✅ **Ledger.js** - Uses apiClient for transaction history
- ✅ **Accounts.js** - Uses apiClient to add transactions

---

## 🌍 CORS Configuration

The backend now supports multiple frontend URLs:

### Allowed Origins

- `http://localhost:5173` (Development - Vite)
- `https://bakerylejah.vercel.app` (Production)

### If you need to add more URLs

Edit `backend/.env`:

```
FRONTEND_URLS=http://localhost:5173,https://bakerylejah.vercel.app,https://your-new-domain.com
```

---

## 🛠️ Deployment Configuration

### Backend (Vercel/Railway)

```
PORT=5003
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-production-secret
FRONTEND_URLS=http://localhost:5173,https://bakerylejah.vercel.app,https://your-backend-domain.com
```

### Frontend (Vercel)

```
REACT_APP_API_URL=https://bakery-backend.vercel.app
```

---

## 📝 Environment Files

### Development (Local)

- `backend/.env` - Configured ✅
- `frontend/.env` - Configured ✅

### Production Examples

- `backend/.env.example` - Reference template
- `frontend/.env.example` - Reference template

---

## ✨ API Endpoints

All endpoints automatically use the configured `REACT_APP_API_URL`:

### Authentication

- `POST /api/auth/login` - Login with username & PIN
- `POST /api/auth/register` - Register new user

### Transactions

- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Add new transaction
- `GET /api/transactions/summary/pl` - Get P&L summary

---

## 🧪 Testing

### Test User Creation

```bash
curl -X POST http://localhost:5003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "pin": "1234"}'
```

### Login Test

```bash
curl -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "pin": "1234"}'
```

### Get Transactions

```bash
curl -X GET http://localhost:5003/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🐛 Troubleshooting

| Issue                        | Solution                                          |
| ---------------------------- | ------------------------------------------------- |
| MongoDB connection fails     | Check `MONGO_URI` in `.env`                       |
| CORS error on frontend       | Add URL to `FRONTEND_URLS` in backend `.env`      |
| Frontend can't reach backend | Check `REACT_APP_API_URL` in frontend `.env`      |
| API returns 401              | JWT token expired or invalid, need to login again |
| Port 5003 in use             | Kill process or use different port in `.env`      |

---

## 📚 Files Modified/Created

✅ Backend

- `backend/.env` - Updated with MongoDB Atlas & CORS config
- `backend/server.js` - Updated with dynamic CORS & MONGO_URI
- `backend/.env.example` - Reference template

✅ Frontend

- `frontend/.env` - Development API URL
- `frontend/.env.production` - Production API URL
- `frontend/.env.example` - Reference template
- `frontend/src/config/api.js` - NEW: Centralized API client
- `frontend/src/pages/*.js` - Updated all pages to use apiClient

---

## ✅ Next Steps

1. ✅ Backend configured with MongoDB Atlas
2. ✅ Frontend configured with environment variables
3. ✅ CORS set up for development & production
4. 🔜 Deploy backend to Vercel/Railway
5. 🔜 Deploy frontend to Vercel
6. 🔜 Add more frontend URLs to CORS after deployment
