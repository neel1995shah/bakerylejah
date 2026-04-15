import React, { useState } from 'react';
import apiClient from '../config/api';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePinChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,4}$/.test(value)) {
      setPin(value);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !pin) {
      setError('Username and PIN are required');
      setLoading(false);
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.post('/api/auth/login', {
        username,
        pin
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
      onLogin(response.data.token, response.data.username);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Financial Management System</h1>
        <h2>Login</h2>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="pin">4-Digit PIN</label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter 4-digit PIN"
              maxLength="4"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
