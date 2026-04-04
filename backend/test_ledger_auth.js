import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

const SECRET = process.env.JWT_SECRET || 'secret';
const USER_ID = '69d1336a5b4f6e1f0e74b5c7'; // From earlier logs
const CUSTOMER_ID = '69c6bfa074d4e477768aeb23'; // From user error

async function test() {
  const token = jwt.sign({ id: USER_ID }, SECRET);
  console.log(`[TEST] Using token: ${token}`);
  try {
    const res = await axios.get(`http://localhost:5000/api/customers/${CUSTOMER_ID}/ledger`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[TEST] SUCCESS:', res.status, res.data.length, 'entries');
  } catch (err) {
    console.error('[TEST] ERROR:', err.response?.status, err.response?.data || err.message);
  }
}

test();
