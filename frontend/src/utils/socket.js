import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'https://bakerylejah.onrender.com';

export const socket = io(API_URL, {
  autoConnect: false,
  reconnection: true
});
