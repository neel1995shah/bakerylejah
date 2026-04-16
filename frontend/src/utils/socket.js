import { io } from 'socket.io-client';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost ? `http://${window.location.hostname}:5000` : 'https://bakerylejah.onrender.com';

export const socket = io(API_URL, {
  autoConnect: false,
  reconnection: true
});
