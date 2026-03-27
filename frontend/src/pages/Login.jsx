import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Store, User, Lock, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import brandLogo from '../assets/logo.svg';

const adminRoles = ['owner', 'sub_manager', 'manager'];

export default function Login() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const logoRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance animation
      gsap.fromTo(containerRef.current, 
        { opacity: 0 }, 
        { opacity: 1, duration: 1, ease: 'power2.out' }
      );
      
      gsap.fromTo(cardRef.current,
        { scale: 0.8, opacity: 0, rotateX: 20 },
        { scale: 1, opacity: 1, rotateX: 0, duration: 1.2, ease: 'elastic.out(1, 0.75)', delay: 0.2 }
      );

      gsap.fromTo(logoRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, delay: 0.6, ease: 'back.out(1.7)' }
      );

      const formElements = formRef.current.children;
      gsap.fromTo(formElements,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.8, ease: 'power2.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const { left, top, width, height } = card.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    gsap.to(card, {
      rotateY: x * 10,
      rotateX: -y * 10,
      duration: 0.3,
      ease: 'power2.out'
    });
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const cleanPin = String(pin || '').replace(/\D/g, '');
      if (cleanPin.length !== 4) {
        setError('PIN must be exactly 4 digits.');
        setLoading(false);
        return;
      }

      const res = await axios.post('/api/auth/login', { username, pin: cleanPin });
      const { token, role, _id } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', _id);
      localStorage.setItem('username', username);

      gsap.to(cardRef.current, {
        scale: 1.1,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
        onComplete: () => navigate(adminRoles.includes(role) ? '/manager' : '/worker')
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
      gsap.fromTo(cardRef.current, 
        { x: -5 }, 
        { x: 5, duration: 0.1, repeat: 5, yoyo: true, ease: 'power2.inOut' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-[#F9F6F0] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans"
      style={{ perspective: '1200px' }}
    >
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#143129]/5 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#143129]/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="max-w-md w-full backdrop-blur-md bg-white/70 rounded-[32px] shadow-antigravity border border-white/40 overflow-hidden transform-gpu"
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="p-10 text-center">
          <div ref={logoRef} className="inline-flex p-1 rounded-full mb-6 shadow-2xl transform-gpu ring-2 ring-[#143129]/10" style={{ transform: 'translateZ(30px)' }}>
            <img src={brandLogo} alt="Lejaah logo" className="h-20 w-20 rounded-full object-cover" />
          </div>
          <h2 className="text-4xl font-extrabold text-[#143129] tracking-tight mb-2 transform-gpu" style={{ transform: 'translateZ(20px)' }}>
            Lejaah
          </h2>
          <p className="text-[#143129]/60 font-medium transform-gpu" style={{ transform: 'translateZ(10px)' }}>
            Experience Weightless Management
          </p>
        </div>
        
        <div className="px-10 pb-12">
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm text-red-600 p-4 rounded-2xl text-sm mb-8 border border-red-100/50 flex items-center gap-3">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              {error}
            </div>
          )}
          
          <form ref={formRef} onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#143129] ml-1">
                <User size={16} />
                Username
              </label>
              <div className="relative group">
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-[#143129]/10 focus:border-[#143129]/30 focus:bg-white/80 focus:ring-4 focus:ring-[#143129]/5 transition-all duration-300 outline-none placeholder:text-[#143129]/20"
                  placeholder="Manager ID or Worker ID" 
                  value={username} 
                  onChange={e=>setUsername(e.target.value)} 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#143129] ml-1">
                <Lock size={16} />
                4-Digit PIN
              </label>
              <div className="relative group">
                <input 
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-full px-6 py-4 rounded-2xl bg-white/50 border border-[#143129]/10 focus:border-[#143129]/30 focus:bg-white/80 focus:ring-4 focus:ring-[#143129]/5 transition-all duration-300 outline-none placeholder:text-[#143129]/20"
                  placeholder="0000"
                  value={pin}
                  onChange={e=>setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required 
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full group relative bg-[#143129] py-5 px-6 rounded-2xl shadow-[0_10px_30px_rgba(20,49,41,0.3)] hover:shadow-[0_15px_40px_rgba(20,49,41,0.4)] transition-all duration-500 overflow-hidden active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <span className="relative flex items-center justify-center gap-2 text-[#F9F6F0] font-bold text-lg">
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Authenticating
                  </>
                ) : (
                  'Sign In'
                )}
              </span>
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer Text */}
      <footer className="mt-8 text-[#143129]/30 text-xs font-medium tracking-widest uppercase">
        A VENTURE BY SHREE JAIN BAKERY
      </footer>
    </div>
  );
}
