import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Sparkles } from 'lucide-react';

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
    <div className="relative min-h-screen flex flex-col justify-center items-center p-4 md:p-8 overflow-hidden">
      <div className="orb orb--one" aria-hidden="true" />
      <div className="orb orb--two" aria-hidden="true" />

      <div className="glass relative max-w-md w-full rounded-3xl overflow-hidden p-1">
        <div className="rounded-[22px] bg-white/10">
          <div className="p-8 text-center border-b border-white/15">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/30 mb-5 text-white/90 text-sm tracking-wide">
              <Sparkles size={16} />
              Secure Access Portal
            </div>
            <div className="inline-flex p-4 rounded-2xl mb-4 bg-white/20 border border-white/35 shadow-lg shadow-black/20">
              <ShieldCheck size={34} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">FreshMarket Control Deck</h2>
            <p className="text-white/75 mt-2">Manager and staff authentication</p>
          </div>

          <div className="p-8">
          {error && (
            <div className="bg-red-500/15 text-red-100 p-3 rounded-xl text-sm mb-6 border border-red-300/35">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Username</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/25 text-white placeholder:text-white/45 focus:ring-2 focus:ring-cyan-300/70 focus:border-cyan-200 transition-colors outline-none"
                placeholder="Enter manager or worker ID"
                value={username}
                onChange={e=>setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/25 text-white placeholder:text-white/45 focus:ring-2 focus:ring-cyan-300/70 focus:border-cyan-200 transition-colors outline-none"
                placeholder="********"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold bg-gradient-to-r from-cyan-300 to-emerald-300 text-slate-900 shadow-lg shadow-cyan-900/30 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <p className="text-xs text-white/60 text-center pt-1">
              Protected session. Unauthorized access is logged.
            </p>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}