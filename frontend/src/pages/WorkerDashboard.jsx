import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../config/runtime.js';
import { Truck, MapPin, CheckCircle, Package, Clock, Phone, Navigation, AlertTriangle } from 'lucide-react';
import gsap from 'gsap';
import Modal from '../components/ui/Modal.jsx';

export default function WorkerDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [missingItemId, setMissingItemId] = useState('');
  
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchData = async () => {
      try {
        const [ordersRes, invRes] = await Promise.all([
          axios.get('/api/orders/my-deliveries'),
          axios.get('/api/inventory')
        ]);
        setDeliveries(ordersRes.data);
        setInventory(invRes.data);
        
        // Staggered entrance
        gsap.fromTo(".delivery-card", 
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: "power2.out" }
        );
      } catch (err) {
        console.error('Failed to fetch deliveries', err);
      }
    };
    fetchData();

    const socket = io(SOCKET_ORIGIN);
    socket.on('connect', () => {
      const username = localStorage.getItem('username');
      socket.emit('join_room', username);
    });

    socket.on('orderAssigned', (order) => {
      setDeliveries(prev => [...prev, order]);
    });

    return () => socket.disconnect();
  }, []);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await axios.patch(`/api/orders/${orderId}/status`, { status });
      setDeliveries(prev => prev.map(o => o._id === orderId ? res.data : o));
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleReportMissing = async () => {
    if (!missingItemId) return;
    try {
      await axios.put(`/api/inventory/${missingItemId}`, {
        quantity: 0
      });
      setReportModalOpen(false);
      setMissingItemId('');
      alert("Item reported as missing. Manager notified.");
    } catch (err) {
      console.error('Failed to report missing stock', err);
    }
  };

  const activeDeliveries = deliveries.filter(d => d.deliveryStatus !== 'delivered');

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      <header className="delivery-card flex flex-col gap-2">
        <h1 className="text-4xl font-black text-primary tracking-tight">Your Route</h1>
        <p className="text-primary/40 font-medium">You have <span className="text-primary font-bold">{activeDeliveries.length} active</span> deliveries today.</p>
      </header>

      <div className="space-y-6">
        {activeDeliveries.length > 0 ? (
          activeDeliveries.map((delivery) => (
            <div key={delivery._id} className="delivery-card glass-card p-0 overflow-hidden relative group">
              {/* Status Ribbon */}
              <div className={`absolute top-0 left-0 w-2 h-full ${delivery.deliveryStatus === 'in-transit' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
              
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start pl-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Order Reference</p>
                    <h3 className="text-2xl font-black text-primary tracking-tighter">#{delivery._id.slice(-6).toUpperCase()}</h3>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(delivery.deliveryStatus)}`}>
                    {delivery.deliveryStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-4 border-l border-black/5">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary/70">Delivery Address</p>
                      <p className="font-bold text-primary leading-tight mt-1">{delivery.customer?.address || 'No Address Provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/5 rounded-2xl text-primary">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary/70">Customer</p>
                      <p className="font-bold text-primary leading-tight mt-1">{delivery.customer?.name}</p>
                      <span className="text-xs font-bold text-primary/60">{delivery.customer?.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/70 flex items-center gap-2">
                      <Package size={14} /> Package Contents
                    </p>
                    <button 
                      onClick={() => { setSelectedOrder(delivery); setReportModalOpen(true); }}
                      className="text-[10px] font-black text-red-500 hover:text-red-600 flex items-center gap-1 uppercase"
                    >
                      <AlertTriangle size={12} /> Report Issue
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {delivery.items.map((item, idx) => (
                      <div key={idx} className="bg-white/60 p-3 rounded-2xl flex items-center justify-between">
                         <span className="text-xs font-bold text-primary truncate mr-2">{item.product?.name}</span>
                         <span className="bg-primary text-secondary text-[10px] font-black px-2 py-0.5 rounded-full">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  {delivery.deliveryStatus === 'assigned' && (
                    <button
                      onClick={() => updateStatus(delivery._id, 'in-transit')}
                      className="btn-primary flex-1 group"
                    >
                      <Navigation size={20} className="group-hover:rotate-12 transition-transform" /> START DELIVERY
                    </button>
                  )}
                  {delivery.deliveryStatus === 'in-transit' && (
                    <button
                      onClick={() => updateStatus(delivery._id, 'delivered')}
                      className="flex-1 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-lg shadow-green-200 font-black hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 tracking-widest"
                    >
                      <CheckCircle size={20} /> MARK AS DELIVERED
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="delivery-card glass-card p-16 text-center space-y-4">
            <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
              <Clock size={40} className="text-primary/20" />
            </div>
            <h3 className="text-xl font-black text-primary tracking-tight">All Caught Up!</h3>
            <p className="text-primary/40 text-sm font-medium">No active deliveries assigned to you right now.</p>
          </div>
        )}
      </div>

      {deliveries.filter(d => d.deliveryStatus === 'delivered').length > 0 && (
         <div className="delivery-card pt-10 border-t border-black/5">
            <h3 className="text-lg font-black text-primary/30 uppercase tracking-[0.2em] mb-6">Completed Deliveries</h3>
            <div className="space-y-4 grayscale opacity-60">
               {deliveries.filter(d => d.deliveryStatus === 'delivered').slice(0, 3).map(d => (
                  <div key={d._id} className="glass-card p-6 flex justify-between items-center">
                     <div>
                        <p className="font-bold text-primary">#{d._id.slice(-6).toUpperCase()}</p>
                        <p className="text-xs font-medium text-primary/40">{d.customer?.name}</p>
                     </div>
                     <CheckCircle className="text-green-500" size={24} />
                  </div>
               ))}
            </div>
         </div>
      )}

      {/* Report Missing Stock Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setReportModalOpen(false)} title="Report Issue">
        <div className="space-y-6">
          <p className="text-sm font-medium text-primary/60">
            If an item is missing or damaged, please select it below. This will zero out the current inventory and alert the manager.
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Select Affected Item</label>
            <select 
              value={missingItemId}
              onChange={(e) => setMissingItemId(e.target.value)}
              className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="" disabled>-- Choose Item --</option>
              {selectedOrder?.items?.map((i, idx) => {
                const invRecord = inventory.find(inv => inv.product?._id === i.product?._id);
                return invRecord ? (
                  <option key={idx} value={invRecord._id}>{i.product?.name} (Qty: {i.quantity})</option>
                ) : null;
              })}
            </select>
          </div>
          <button 
            onClick={handleReportMissing}
            disabled={!missingItemId}
            className="w-full btn-primary !bg-red-500 !text-white hover:!bg-red-600 disabled:!bg-gray-200"
          >
            SUBMIT LOG
          </button>
        </div>
      </Modal>
    </div>
  );
}

const getStatusColor = (status) => {
  switch (status) {
    case 'assigned': return 'bg-blue-100 text-blue-600';
    case 'in-transit': return 'bg-yellow-100 text-yellow-600';
    case 'delivered': return 'bg-green-100 text-green-600';
    default: return 'bg-gray-100 text-gray-500';
  }
};
