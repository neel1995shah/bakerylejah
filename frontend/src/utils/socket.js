import { io } from 'socket.io-client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const socket = io(API_URL, {
  autoConnect: true,
  reconnection: true
});
