export const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://bakerylejah.onrender.com');

export const SOCKET_ORIGIN =
  import.meta.env.VITE_SOCKET_URL ||
  BACKEND_ORIGIN;
