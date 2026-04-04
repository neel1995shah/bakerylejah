import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { SOCKET_ORIGIN } from '../config/runtime.js';
import { Package, TrendingUp, AlertTriangle, CheckCircle, Truck, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

export default function ManagerDashboard() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchData = async () => {
      try {
        const [ordersRes, invRes] = await Promise.all([
          axios.get('/api/orders'),
          axios.get('/api/inventory')
        ]);
        setOrders(ordersRes.data);
        setInventory(invRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchData();

    const socket = io(SOCKET_ORIGIN);
    socket.on('connect', () => socket.emit('join_room', 'manager'));
    socket.on('orderCreated', o => setOrders(prev => [...prev, o]));
    socket.on('workerAssigned', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryStarted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryCompleted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('stockUpdated', inv => setInventory(prev => prev.map(old => old._id === inv._id ? inv : old)));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const cards = containerRef.current?.querySelectorAll('.dash-card');
    if (!cards || cards.length === 0) return;

    gsap.fromTo(cards,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'power2.out', overwrite: 'auto' }
    );
  }, [orders.length, inventory.length]);

  const activeOrders = orders.filter(o => o.deliveryStatus !== 'delivered').length;
  const lowStock = inventory.filter(i => i.quantity <= i.reorderLevel).length;
  const completedOrders = orders.filter((o) => o.deliveryStatus === 'delivered');
  const completedCount = completedOrders.length;

  const hourBuckets = Array.from({ length: 24 }, () => 0);
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    if (!Number.isNaN(d.getTime())) {
      hourBuckets[d.getHours()] += 1;
    }
  });
  const peakHour = hourBuckets.reduce((best, count, idx, arr) => (count > arr[best] ? idx : best), 0);
  const peakHourOrders = hourBuckets[peakHour] || 0;

  const deliveredByCounts = completedOrders.reduce((acc, o) => {
    const by = getDeliveredByLabel(o);
    acc[by] = (acc[by] || 0) + 1;
    return acc;
  }, {});

  const topDeliverers = Object.entries(deliveredByCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentCompleted = [...completedOrders]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 6);

  return (
    <div ref={containerRef} className="space-y-6 pb-20">
      {/* Header Info */}
      <div className="dash-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-primary tracking-tight">System Status</h1>
          <p className="text-primary/70 font-medium">Real-time overview of your bakery's logistics.</p>
        </div>
      </div>

      {/* Top Stats - Compact 2-Column Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Route" value={activeOrders} suffix="Orders" icon={<Truck size={20} />} trend="live" />
        <StatCard title="Completed Orders" value={completedCount} suffix="Delivered" icon={<CheckCircle size={20} />} />
        <StatCard title="Peak Order Time" value={peakHourOrders > 0 ? formatHourRange(peakHour) : '--'} suffix={peakHourOrders > 0 ? `${peakHourOrders} Orders` : 'No Data'} icon={<TrendingUp size={20} />} />
        <StatCard title="Stock Warnings" value={lowStock} icon={<AlertTriangle size={20} />} alert={lowStock > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Snippet */}
        <div className="dash-card glass-card !p-0 overflow-hidden flex flex-col min-h-[250px]">
          <div className="p-6 border-b border-black/5 flex justify-between items-center">
            <h3 className="text-xl font-black text-primary tracking-tight">Recent Activity</h3>
            {orders.length > 0 && (
              <button className="min-w-[44px] min-h-[44px] text-xs font-bold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors flex items-center justify-center gap-1 active:scale-95">
                View All <ArrowRight size={14} />
              </button>
            )}
          </div>
          <div className="p-4 space-y-3 flex-1 flex flex-col">
            {orders.slice(-5).reverse().map((o) => (
              <div key={o._id} className="group flex items-center justify-between p-4 bg-white/30 rounded-2xl border border-transparent hover:border-black/5 hover:bg-white/60 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${getStatusPulse(o.deliveryStatus)}`} />
                  <div>
                    <p className="font-bold text-primary group-hover:translate-x-1 transition-transform tracking-tight text-sm sm:text-base">
                      {o.customer?.name || 'Walk-in'}
                    </p>
                    <p className="text-[10px] font-black uppercase text-primary/60">#{o._id.slice(-6)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-primary text-sm sm:text-base">₹{(o.totalAmount || 0).toFixed(2)}</p>
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-full mt-1 uppercase tracking-tighter ${getStatusColor(o.deliveryStatus)}`}>
                    {o.deliveryStatus}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 opacity-60">
                <Package size={40} className="text-primary/30 mb-2" />
                <p className="text-primary/70 text-sm font-bold uppercase tracking-widest">No active orders</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory Snippet */}
        <div className="dash-card glass-card !p-0 overflow-hidden flex flex-col min-h-[250px]">
          <div className="p-6 border-b border-black/5 flex justify-between items-center">
            <h3 className="text-xl font-black text-primary tracking-tight">Stock Alerts</h3>
            {lowStock > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full">{lowStock} CRITICAL</span>}
          </div>
          <div className="p-4 space-y-3 flex-1 flex flex-col">
            {inventory.filter(i => i.quantity <= i.reorderLevel).slice(0, 4).map(i => (
              <div key={i._id} className="flex items-center justify-between p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex flex-shrink-0 items-center justify-center bg-red-500/10 rounded-xl">
                    <AlertTriangle className="text-red-500" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-primary tracking-tight text-sm sm:text-base line-clamp-1 break-all pr-2">{i.product?.name || 'Unknown'}</p>
                    <p className="text-[10px] font-bold text-red-600 uppercase">Limit: {i.reorderLevel}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-red-600 text-xl sm:text-2xl tracking-tighter">{i.quantity}</p>
                  <p className="text-[10px] font-black text-red-600/70 uppercase">Left</p>
                </div>
              </div>
            ))}
            {lowStock === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center opacity-60">
                <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle size={24} className="text-primary/70" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-primary/70">Inventory Secured</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dash-card glass-card !p-0 overflow-hidden flex flex-col min-h-[260px]">
          <div className="p-6 border-b border-black/5 flex justify-between items-center">
            <h3 className="text-xl font-black text-primary tracking-tight">Who Delivered</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">Completed Orders</span>
          </div>
          <div className="p-4 space-y-3 flex-1">
            {topDeliverers.length > 0 ? topDeliverers.map((d) => (
              <div key={d.name} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-black/5">
                <div>
                  <p className="font-black text-primary tracking-tight">{d.name}</p>
                  <p className="text-[10px] font-bold uppercase text-primary/50">Delivered by</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-primary tracking-tighter">{d.count}</p>
                  <p className="text-[10px] font-bold uppercase text-primary/50">Orders</p>
                </div>
              </div>
            )) : (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center opacity-60">
                <Truck size={28} className="text-primary/40 mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest text-primary/70">No delivered orders yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="dash-card glass-card !p-0 overflow-hidden flex flex-col min-h-[260px]">
          <div className="p-6 border-b border-black/5 flex justify-between items-center">
            <h3 className="text-xl font-black text-primary tracking-tight">Recent Completed</h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">With Time</span>
          </div>
          <div className="p-4 space-y-3 flex-1">
            {recentCompleted.length > 0 ? recentCompleted.map((o) => (
              <div key={o._id} className="flex items-center justify-between p-4 bg-green-50/60 rounded-2xl border border-green-200/40">
                <div>
                  <p className="font-black text-primary tracking-tight text-sm sm:text-base">{o.customer?.name || 'Walk-in'}</p>
                  <p className="text-[10px] font-bold uppercase text-primary/55">{getDeliveredByLabel(o)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-black uppercase text-green-700">{formatDateTime(o.updatedAt)}</p>
                  <p className="text-[10px] font-bold text-primary/50">#{o._id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
            )) : (
              <div className="h-full min-h-[180px] flex flex-col items-center justify-center opacity-60">
                <CheckCircle size={28} className="text-primary/40 mb-2" />
                <p className="text-sm font-bold uppercase tracking-widest text-primary/70">No completed timeline</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, suffix, icon, alert, trend }) {
  return (
    <div className={`dash-card glass-card rounded-2xl p-4 h-[120px] flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${alert ? 'border-red-500/30' : ''}`}>
      {trend === 'live' && (
        <div className="absolute top-3 right-3 flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-[9px] font-bold text-green-700 uppercase tracking-widest hidden sm:inline-block">Live</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-colors duration-300 ${alert ? 'bg-red-500/10 text-red-600' : 'bg-primary/5 text-primary'}`}>
          {icon}
        </div>
        <p className="text-[10px] sm:text-xs font-black uppercase text-primary/70 leading-tight line-clamp-2 pr-1">{title}</p>
      </div>

      <div className="flex items-end gap-1.5 mt-auto">
        <h4 className={`text-2xl sm:text-3xl font-black tracking-tighter leading-none ${alert ? 'text-red-600' : 'text-primary'}`}>{value}</h4>
        {suffix && <span className="text-[10px] font-bold text-primary/60 uppercase mb-0.5">{suffix}</span>}
      </div>
    </div>
  )
}

function getStatusPulse(status) {
  switch (status) {
    case 'pending': return 'bg-gray-400';
    case 'assigned': return 'bg-blue-400';
    case 'in-transit': return 'bg-yellow-400';
    case 'delivered': return 'bg-green-400';
    default: return 'bg-gray-200';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-700';
    case 'assigned': return 'bg-blue-100 text-blue-700';
    case 'in-transit': return 'bg-yellow-100 text-yellow-700';
    case 'delivered': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    case 'issue': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function formatHourRange(hour) {
  const start = new Date();
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(hour + 1);
  const startLabel = start.toLocaleTimeString([], { hour: 'numeric', hour12: true });
  const endLabel = end.toLocaleTimeString([], { hour: 'numeric', hour12: true });
  return `${startLabel} - ${endLabel}`;
}

function formatDateTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function getDeliveredByLabel(order) {
  if (order?.assignedBySelf) return 'By Self';
  if (order?.assignedWorker?.username) return order.assignedWorker.username;
  return 'Not Assigned';
}
