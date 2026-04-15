# Bakery Financial Management System

A full-stack web application for managing bakery finances with features for tracking income, expenses, and generating profit & loss (P&L) statements.

## Features

- **User Authentication**: Login with username and 4-digit PIN
- **Profit & Loss (P&L)**: View total income, expenses, and net profit/loss
- **Ledger**: Track all transactions with filtering by type
- **Accounts**: Add new income and expense transactions
- **Dashboard**: Clean and intuitive user interface

## Technology Stack

### Backend

- Node.js with Express.js
- MongoDB
- JWT Authentication
- bcryptjs for PIN encryption

### Frontend

- React 18
- React Router v6
- Axios for API calls
- CSS3 with responsive design

## Project Structure

```
bakery/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── transactions.js
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.js
│   │   │   ├── PAndL.js
│   │   │   ├── Ledger.js
│   │   │   └── Accounts.js
│   │   ├── styles/
│   │   │   ├── Login.css
│   │   │   ├── Dashboard.css
│   │   │   └── App.css
│   │   ├── App.js
│   │   ├── index.js
│   │   └── App.css
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:
   - Edit `.env` file with your MongoDB connection string and JWT secret
   - Default: `mongodb://localhost:27017/bakery`

4. Start the backend server:

```bash
npm start
# For development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:5003`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The frontend will open automatically at `http://localhost:3000`

## Default Test Credentials

### Creating a test user (Register first)

When you first start the application, you can register a user through the backend API:

```bash
curl -X POST http://localhost:5003/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "pin": "1234"
  }'
```

Then login with:

- Username: `testuser`
- PIN: `1234`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with username and PIN

### Transactions

- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Add new transaction
- `GET /api/transactions/summary/pl` - Get P&L summary

## Usage Guide

### Login Page

1. Enter your username and 4-digit PIN
2. Click "Login" to access the dashboard

### P&L Page

- View total income, total expenses, and net profit/loss
- Data updates automatically based on recorded transactions

### Ledger Page

- View all transactions in a table format
- Filter by "All Transactions", "Income", or "Expenses"
- See transaction details including date, category, amount, and description

### Accounts Page (Add Transaction)

1. Select transaction type (Income or Expense)
2. Choose category from dropdown
3. Enter amount in rupees (₹)
4. Add optional description
5. Click "Record Transaction"

## Database Schema

### User Model

```javascript
{
  username: String (unique),
  pin: String (hashed),
  createdAt: Date
}
```

### Transaction Model

```javascript
{
  userId: ObjectId (ref: User),
  type: String (enum: ['income', 'expense']),
  category: String,
  amount: Number,
  description: String,
  date: Date,
  createdAt: Date
}
```

## Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running: `mongod`
- Check connection string in `.env` file
- If using MongoDB Atlas, update `.env` with your connection string

### Port Already in Use

- Backend (port 5003): `lsof -ti:5003 | xargs kill -9`
- Frontend (port 3000): `lsof -ti:3000 | xargs kill -9`

### CORS Errors

- Ensure backend is running on port 5003
- Check that frontend API calls use `http://localhost:5003`

### Login Issues

- Ensure PIN is exactly 4 digits
- Verify user exists by registering first
- Check JWT_SECRET in `.env` file

## Future Enhancements

- Export reports to PDF/Excel
- Monthly/yearly P&L analysis
- Budget tracking and alerts
- Multi-user support with role-based access
- Expense categorization with analytics
- Dark mode
- Mobile app version

## License

MIT License - feel free to use this project for your bakery!

## Support

For issues or questions, please create an issue in the repository.
