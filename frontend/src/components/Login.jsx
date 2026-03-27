import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const adminRoles = ['owner', 'sub_manager', 'manager'];

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const cleanPin = String(pin || '').replace(/\D/g, '').slice(0, 4);
      if (cleanPin.length !== 4) {
        alert('PIN must be exactly 4 digits');
        return;
      }

      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin: cleanPin })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('userId', data._id);
        navigate(adminRoles.includes(data.role) ? '/manager' : '/worker');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Error connecting to the server');
    }
  };

  return (
    <div className="login-container">
      <h2>Grocery Store Login</h2>
      <form onSubmit={handleLogin}>
        <input placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} required />
        <input type="password" inputMode="numeric" maxLength={4} placeholder="4-digit PIN" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} required />
        <button type="submit">Login</button>
      </form>
    </div>
  );
}