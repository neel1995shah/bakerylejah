# Quick Start Guide

## Step 1: Start MongoDB
Make sure MongoDB is running on your system:
```bash
mongod
```

## Step 2: Start Backend
```bash
cd backend
npm install
npm start
```
Look for: `Server running on port 5000`

## Step 3: Register a User (in another terminal)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "pin": "1234"}'
```

## Step 4: Start Frontend
```bash
cd frontend
npm install
npm start
```
Your browser should open to `http://localhost:3000`

## Step 5: Login
- Username: `testuser`
- PIN: `1234`

## Step 6: Start Using the App!

### Dashboard Features:
1. **P&L** - See your profit & loss at a glance
2. **Ledger** - View all transactions
3. **Accounts** - Add new income/expense entries

---

## Useful Commands

### Restart Backend
```bash
cd backend
npm run dev  # Restarts automatically on file changes
```

### Restart Frontend
```bash
cd frontend
npm start
```

### Reset MongoDB Data
Delete all transactions (optional):
```bash
# Connect to MongoDB shell
mongosh
# In mongo shell:
use bakery
db.transactions.deleteMany({})
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection error | Ensure `mongod` is running |
| Port 5000 in use | `netstat -ano \| findstr :5000` (Windows) |
| Port 3000 in use | `netstat -ano \| findstr :3000` (Windows) |
| Login fails | Make sure user is registered with 4-digit PIN |
| CORS errors | Check both servers are running |

---

## Next Steps

1. Add more users with different PINs
2. Record some income and expense transactions
3. Check P&L to see your profit/loss
4. Use Ledger to view transaction history
5. Customize categories in `Accounts.js` as needed
