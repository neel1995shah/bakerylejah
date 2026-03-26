import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { MapPin, Box, Check, Play, Navigation, AlertTriangle, Coffee } from 'lucide-react';
import Modal from '../components/ui/Modal.jsx';

export default function WorkerDashboard() {
  const [orders, setOrders] = useState([]);
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
          axios.get('http://localhost:5000/api/orders'),
          axios.get('http://localhost:5000/api/inventory')
        ]);
        
        const availableOrMine = ordersRes.data.filter(o => 
          o.deliveryStatus === 'pending' || 
          (o.assignedWorker && o.assignedWorker._id === userId)
        );
        setOrders(availableOrMine);
        setInventory(invRes.data);
      } catch (err) {
        console.error('Failed to load data', err);
      }
    };
    fetchData();

    const socket = io('http://localhost:5000');
    socket.on('connect', () => socket.emit('join_room', 'worker'));

    socket.on('orderCreated', order => setOrders(prev => [order, ...prev]));
    socket.on('workerAssigned', order => {
      setOrders(prev => {
        if (order.assignedWorker._id !== userId) return prev.filter(o => o._id !== order._id);
        const exists = prev.find(o => o._id === order._id);
        return exists ? prev.map(o => o._id === order._id ? order : o) : [order, ...prev];
      });
    });
    socket.on('deliveryStarted', order => setOrders(prev => prev.map(o => o._id === order._id ? order : o)));
    socket.on('deliveryCompleted', order => setOrders(prev => prev.map(o => o._id === order._id ? order : o)));
    socket.on('stockUpdated', inv => setInventory(prev => prev.map(o => o._id === inv._id ? inv : o)));

    return () => socket.disconnect();
  }, [userId]);

  const updateStatus = async (orderId, endpoint, payload) => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${orderId}/${endpoint}`, payload);
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const handleReportMissing = async () => {
    if (!missingItemId) return;
    try {
      // Set inventory of that item to 0 and notify manager
      await axios.put(`http://localhost:5000/api/inventory/${missingItemId}`, {
        quantity: 0
      });
      setReportModalOpen(false);
      setMissingItemId('');
      alert("Item reported as missing. Manager Dashboard updated.");
    } catch (err) {
      console.error('Failed to report missing stock', err);
    }
  };

  const openReportModal = (order) => {
    setSelectedOrder(order);
    setReportModalOpen(true);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-20">
      {/* Mobile-Friendly Header Area */}
      <div className="bg-surface p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800">My Route</h2>
          <p className="text-xs text-gray-500 mt-1">Manage your deliveries</p>
        </div>
        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Navigation className="text-primary" size={20} />
        </div>
      </div>

      <div className="space-y-4">
        {orders.map(o => (
          <div key={o._id} className="bg-surface rounded-2xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
            
            {/* Status Top Bar */}
            <div className={`px-4 py-2 text-xs font-bold text-white flex justify-between items-center uppercase tracking-wider ${getTopBarColor(o.deliveryStatus)}`}>
              <span>Status: {o.deliveryStatus}</span>
              <span>#{o._id.slice(-5)}</span>
            </div>

            <div className="p-5 flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-1">{o.customer?.name || 'Customer'}</h3>
              
              <div className="flex items-start gap-2 text-sm text-gray-600 mb-4 mt-2">
                <MapPin className="text-primary shrink-0 mt-0.5" size={16} />
                <span>
                  {o.customer?.address?.street || 'No Street'}, {o.customer?.address?.city || 'No City'}
                </span>
              </div>

              {/* Order Items List */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1">
                  <Box size={14} /> Items to Deliver
                </p>
                <ul className="space-y-2">
                  {o.items?.map((itemLine, idx) => (
                    <li key={idx} className="flex justify-between text-sm items-center">
                      <span className="font-medium text-gray-700">
                        <span className="text-primary mr-1">{itemLine.quantity}x</span> 
                        {itemLine.product?.name || 'Unknown Item'}
                      </span>
                    </li>
                  ))}
                  {(!o.items || o.items.length === 0) && (
                    <li className="text-sm text-gray-500">No items listed.</li>
                  )}
                </ul>
              </div>

            </div>

            {/* Action Buttons Map explicitly to constraints: Preparing -> Out for Delivery -> Delivered */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-2">
              {o.deliveryStatus === 'pending' && (
                <button 
                  onClick={() => updateStatus(o._id, 'assign', { workerId: userId })}
                  className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold transition-all"
                >
                  Accept Delivery
                </button>
              )}

              {o.deliveryStatus === 'assigned' && o.assignedWorker?._id === userId && (
                <button 
                  onClick={() => updateStatus(o._id, 'status', { status: 'in-transit' })}
                  className="w-full py-3 bg-secondary hover:bg-yellow-600 text-white rounded-xl font-bold transition-all shadow-md shadow-secondary/20 flex justify-center items-center gap-2"
                >
                  <Play size={18} fill="currentColor"/> Out for Delivery
                </button>
              )}

              {o.deliveryStatus === 'in-transit' && o.assignedWorker?._id === userId && (
                <button 
                  onClick={() => updateStatus(o._id, 'status', { status: 'delivered' })}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-green-600/20 flex justify-center items-center gap-2"
                >
                  <Check size={18} strokeWidth={3}/> Mark Delivered
                </button>
              )}

              {/* Only show report missing if it hasn't been delivered perfectly yet */}
              {['assigned', 'in-transit'].includes(o.deliveryStatus) && o.assignedWorker?._id === userId && (
                <button 
                  onClick={() => openReportModal(o)}
                  className="w-full py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2"
                >
                  <AlertTriangle size={16} /> Report Missing Stock
                </button>
              )}
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="bg-surface p-10 rounded-2xl text-center shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Coffee className="text-gray-400" size={28} />
            </div>
            <h3 className="text-lg font-bold text-gray-700">No active deliveries</h3>
            <p className="text-sm text-gray-500 mt-1">Take a break, you're all caught up!</p>
          </div>
        )}
      </div>

      {/* Report Missing Stock Modal */}
      <Modal isOpen={isReportModalOpen} onClose={() => setReportModalOpen(false)} title="Report Missing Item">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            If an item is missing from this order, select it below. This will alert the manager and zero out the current inventory.
          </p>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Item</label>
            <select 
              value={missingItemId}
              onChange={(e) => setMissingItemId(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
            >
              <option value="" disabled>-- Choose Missing Item --</option>
              {/* Only show items from this specific order */}
              {selectedOrder?.items?.map((i, idx) => {
                // Find inventory ID associated with this product to zero it out
                const invRecord = inventory.find(inv => inv.product?._id === i.product?._id);
                if (!invRecord) return null;
                return (
                  <option key={idx} value={invRecord._id}>
                    {i.product?.name} (Qty requested: {i.quantity})
                  </option>
                )
              })}
            </select>
          </div>
          <button 
            onClick={handleReportMissing}
            disabled={!missingItemId}
            className="w-full mt-4 bg-red-500 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition"
          >
            Submit Report
          </button>
        </div>
      </Modal>
    </div>
  );
}

function getTopBarColor(status) {
  switch(status) {
    case 'pending': return 'bg-gray-400';
    case 'assigned': return 'bg-blue-500';
    case 'in-transit': return 'bg-secondary';
    case 'delivered': return 'bg-green-500';
    default: return 'bg-gray-400';
  }
}