import axios from 'axios';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_URL = isLocalhost ? `http://${window.location.hostname}:5000` : 'https://bakerylejah.onrender.com';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token.trim() !== '' && token !== 'undefined' && token !== 'null') {
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else if (config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.dispatchEvent(new CustomEvent('finance-auth-expired'));
    }

    // Keep user logged in until manual logout.
    // 401s are returned to callers to handle in-page without forcing a session reset.
    return Promise.reject(error);
  }
);

export default apiClient;
