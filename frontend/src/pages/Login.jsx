import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      const { token, role, _id } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', _id);
      localStorage.setItem('username', username);

      navigate(role === 'manager' ? '/manager' : '/worker');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-primary p-8 text-center">
          <div className="inline-block p-4 bg-secondary rounded-full mb-4 shadow-lg">
            <Store size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">FreshMarket POS</h2>
          <p className="text-primary-100 mt-2 text-white/80">Staff Portal Gateway</p>
        </div>
        
        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-200">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                placeholder="Enter worker or manager ID" 
                value={username} 
                onChange={e=>setUsername(e.target.value)} 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary transition-colors outline-none"
                placeholder="••••••••" 
                value={password} 
                onChange={e=>setPassword(e.target.value)} 
                required 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-secondary hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}