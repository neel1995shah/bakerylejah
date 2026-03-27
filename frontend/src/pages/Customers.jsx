import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Phone, MapPin, CreditCard, ChevronRight, Search } from 'lucide-react';
import gsap from 'gsap';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/customers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCustomers(res.data);
        
        gsap.fromTo(".cust-card", 
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" }
        );
      } catch (err) {
        console.error('Failed to fetch customers', err);
      }
    };
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 pb-10">
      <header className="cust-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tight">Customer Network</h1>
          <p className="text-primary/40 font-medium">Relationships and outstanding credit flows.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
          <input 
            type="text" 
            placeholder="Search partners..." 
            className="w-full pl-12 pr-4 py-4 bg-white/50 border border-black/5 rounded-[2rem] focus:ring-2 focus:ring-primary outline-none font-bold text-primary placeholder:text-primary/20 shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(c => (
          <div key={c._id} className="cust-card glass-card p-8 group hover:scale-[1.02] transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-primary/5 rounded-[1.5rem] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-secondary transition-colors">
                <Users size={28} />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/30 mb-1">Outstanding Balance</p>
                <p className={`text-2xl font-black tracking-tighter ${c.dues > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ${c.dues?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>

            <h3 className="text-2xl font-black text-primary tracking-tight mb-6">{c.name}</h3>
            
            <div className="space-y-4 border-t border-black/5 pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/5 rounded-xl text-primary/40">
                   <Phone size={16} />
                </div>
                <span className="font-bold text-primary/60">{c.phone || 'No direct dial'}</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/5 rounded-xl text-primary/40">
                   <MapPin size={16} />
                </div>
                <span className="font-bold text-primary/60 text-sm leading-tight">
                  {c.address?.street}, {c.address?.city}
                </span>
              </div>
            </div>

            <button className="w-full mt-8 flex justify-between items-center p-4 bg-primary/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary/40 hover:bg-primary hover:text-secondary transition-all group/btn">
              Strategic History <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center glass-card">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4">
               <Users size={40} className="text-primary/10" />
            </div>
            <h3 className="text-xl font-black text-primary/20 uppercase tracking-widest">No matching partners</h3>
          </div>
        )}
      </div>
    </div>
  );
}