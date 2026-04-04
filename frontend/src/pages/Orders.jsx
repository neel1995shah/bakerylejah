import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ShoppingCart, Plus, Minus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import ToastContainer from '../components/ui/ToastContainer.jsx';
import { SOCKET_ORIGIN } from '../config/runtime.js';
import gsap from 'gsap';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [toasts, setToasts] = useState([]);

  const [isPOSModalOpen, setPOSModalOpen] = useState(false);
  const [deliverySelections, setDeliverySelections] = useState({});

  // POS State
  const [orderNotes, setOrderNotes] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [createDeliverySelection, setCreateDeliverySelection] = useState('');

  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: ''
  });

  const addToast = (type, message, title, details) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message, title, details, duration: 6000 }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentUserId = localStorage.getItem('userId');

    if (!token) {
      navigate('/');
      return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const normalizedRole = String(role || '').toLowerCase();
    const isAdminRole = ['owner', 'sub_manager', 'manager', 'admin', 'submanager'].includes(normalizedRole);

    const fetchData = async () => {
      try {
        const [ordersRes, workersRes, invRes] = await Promise.allSettled([
          axios.get('/api/orders'),
          isAdminRole ? axios.get('/api/auth/users?role=worker') : Promise.resolve({ data: [] }),
          axios.get('/api/inventory')
        ]);

        if (ordersRes.status === 'fulfilled') {
          setOrders(ordersRes.value.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }
        if (workersRes.status === 'fulfilled') {
          setWorkers(workersRes.value.data || []);
        } else {
          setWorkers([]);
        }
        if (invRes.status === 'fulfilled') {
          setInventory(invRes.value.data);
        }
        
        gsap.fromTo(".order-animate", 
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out" }
        );
      } catch (error) {
        console.error("Failed to load initial data", error);
        if (error?.response?.status === 401) {
          localStorage.clear();
          navigate('/');
        }
      }
    };
    fetchData();

    const socket = io(SOCKET_ORIGIN);
    socket.on('connect', () => {
      if (role) socket.emit('join_room', role);
      socket.emit('join_room', 'manager');
    });
    socket.on('orderCreated', o => {
      setOrders(prev => [o, ...prev]);
      addToast('order', `New order #${o._id.slice(-6).toUpperCase()} received`, 'New Order', `Customer: ${o.customer?.name || 'Walk-in'}\n${itemsText}\nTotal: ₹${(o.totalAmount || 0).toFixed(2)}`);
    });
    socket.on('workerAssigned', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('orderConfirmed', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('orderCancelled', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('orderIssueRaised', (o) => {
      setOrders(prev => prev.map(old => old._id === o._id ? o : old));
      const raisedById = o?.issueRaisedBy?._id;
      if (raisedById && raisedById !== currentUserId) {
        const by = o?.issueRaisedBy?.username || 'a team member';
        alert(`Order #${o._id.slice(-6).toUpperCase()} has an issue raised by ${by}.`);
      }
    });
    socket.on('deliveryStarted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryCompleted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('stockUpdated', inv => setInventory(prev => prev.map(old => old._id === inv._id ? inv : old)));
    socket.on('orderDeleted', orderId => {
      setOrders(prev => prev.filter(o => o._id !== orderId));
    });

    return () => socket.disconnect();
  }, [navigate]);

  const handleDeliverySelection = (orderId, value) => {
    setDeliverySelections(prev => ({ ...prev, [orderId]: value }));
  };

  const handleConfirmOrder = async (orderId) => {
    const selection = deliverySelections[orderId];
    if (!selection) {
      alert('Please choose delivery boy or By Self before confirmation.');
      return;
    }

    try {
      const payload = selection === 'by_self'
        ? { deliveryOption: 'by_self' }
        : { deliveryOption: 'worker', workerId: selection };

      const res = await axios.put(`/api/orders/${orderId}/confirm`, payload);
      setOrders(prev => prev.map(old => old._id === orderId ? res.data : old));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    const accepted = window.confirm('Cancel this order?');
    if (!accepted) return;

    try {
      const res = await axios.put(`/api/orders/${orderId}/cancel`);
      setOrders(prev => prev.map(old => old._id === orderId ? res.data : old));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleIssueOrder = async (orderId) => {
    const note = window.prompt('Describe the issue to notify owners/sub-managers:', 'Need support on this order');
    if (note === null) return;

    try {
      const res = await axios.put(`/api/orders/${orderId}/issue`, { note });
      setOrders(prev => prev.map(old => old._id === orderId ? res.data : old));
      alert('Issue sent to owners and sub-managers.');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to raise issue');
    }
  };

  const handleMarkDelivered = async (orderId) => {
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status: 'delivered' });
      setOrders(prev => prev.filter(o => o._id !== orderId));
      addToast('success', `Order #${orderId.slice(-6).toUpperCase()} marked as delivered and removed`, 'Order Completed');

    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to mark order as delivered');
    }
  };


  const handleCreateOrder = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Session expired. Please login again.');
      navigate('/');
      return;
    }

    const name = customerForm.name.trim();
    const phone = customerForm.phone.trim();
    const address = customerForm.address.trim();

    if (!orderNotes.trim()) {
      alert('Order notes/description are required.');
      return;
    }

    const totalVal = Number(manualAmount);
    if (!totalVal || totalVal <= 0) {
      alert('Please enter a valid total amount.');
      return;
    }

    try {
      const orderRes = await axios.post('/api/orders', {
        customerData: { name, phone, address },
        totalAmount: totalVal,
        items: [{
          productName: 'General Order', // Placeholder name
          quantity: 1,
          price: totalVal,
          note: orderNotes
        }]
      });


      if (createDeliverySelection) {
        const payload = createDeliverySelection === 'by_self'
          ? { deliveryOption: 'by_self' }
          : { deliveryOption: 'worker', workerId: createDeliverySelection };
        await axios.put(`/api/orders/${orderRes.data._id}/confirm`, payload);
      }

      setPOSModalOpen(false);
      setOrderNotes('');
      setManualAmount('');
      setCreateDeliverySelection('');

    } catch (err) {
      if (err?.response?.status === 401) {
        alert('Session expired. Please login again.');
        localStorage.clear();
        navigate('/');
        return;
      }
      alert(err?.response?.data?.message || 'Failed to create order');
      console.error(err);
    }
  };

  const availableProducts = inventory.filter((inv) => inv.quantity > 0);

  const columns = [
    { 
      header: 'Reference', 
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-black text-primary tracking-tighter">#{r._id.slice(-6).toUpperCase()}</span>
          <span className="text-[10px] font-bold text-primary/30 uppercase">{new Date(r.createdAt).toLocaleDateString()}</span>
        </div>
      ) 
    },
    { 
      header: 'Customer', 
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
            <User size={14} />
          </div>
          <span className="font-bold text-primary/80">{r.customer?.name || 'Walk-in'}</span>
        </div>
      )
    },
    { 
      header: 'Logistics', 
      align: 'center', 
      render: (r) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getDeliveryColor(r.deliveryStatus)}`}>
          {r.deliveryStatus}
        </span>
      )
    },
    { 
      header: 'Handler', 
      align: 'center', 
      render: (r) => (
        r.assignedBySelf ? (
          <span className="text-xs font-black uppercase tracking-widest text-primary/60">By Self</span>
        ) : r.assignedWorker ? (
          <div className="flex items-center gap-2 justify-center">
            <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] font-black text-primary">
              {r.assignedWorker.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-primary/60">{r.assignedWorker.username}</span>
          </div>
        ) : (
          <span className="text-xs font-bold text-primary/30">Unassigned</span>
        )
      )
    },
    {
      header: 'Order Flow',
      align: 'center',
      render: (r) => {
        const isFinalState = ['cancelled', 'delivered'].includes(r.deliveryStatus);
        const isPending = r.deliveryStatus === 'pending';
        const isAssigned = r.deliveryStatus === 'assigned';

        return (
          <div className="flex flex-col gap-2 items-center">
            {isPending && (
              <select
                value={deliverySelections[r._id] || ''}
                onChange={(e) => handleDeliverySelection(r._id, e.target.value)}
                className="min-w-[160px] rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-bold text-primary outline-none"
              >
                <option value="" disabled>Select delivery</option>
                <option value="by_self">By Self</option>
                {workers.map(w => (
                  <option key={w._id} value={w._id}>{w.username}</option>
                ))}
              </select>
            )}

            <div className="flex gap-1.5 flex-wrap justify-center">
              {isPending && (
                <>
                  <button
                    onClick={() => handleConfirmOrder(r._id)}
                    className="px-2 py-1 rounded-lg bg-green-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-green-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleCancelOrder(r._id)}
                    className="px-2 py-1 rounded-lg bg-red-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-red-600"
                  >
                    Cancel
                  </button>
                </>
              )}

              {isAssigned && (
                <button
                  onClick={() => handleMarkDelivered(r._id)}
                  className="px-2 py-1 rounded-lg bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-blue-600"
                >
                  Mark Delivered
                </button>
              )}

              {!isFinalState && (
                <button
                  onClick={() => handleIssueOrder(r._id)}
                  className="px-2 py-1 rounded-lg bg-yellow-400 text-primary text-[10px] font-black uppercase tracking-wider hover:bg-yellow-500"
                >
                  Issue
                </button>
              )}
            </div>
          </div>
        )
      }
    },
    { header: 'Amount', align: 'right', render: (r) => <span className="font-black text-primary">₹{(r.totalAmount || 0).toFixed(2)}</span> }
  ];

  return (
    <div className="space-y-8 pb-10">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <div className="order-animate flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tight">Order Flows</h1>
          <p className="text-primary/40 font-medium">Manage logistics and retail operations.</p>
        </div>
        <button
          onClick={() => setPOSModalOpen(true)}
          className="btn-primary w-full md:w-auto"
        >
          <ShoppingCart size={20} /> ADD ORDER
        </button>
      </div>

      <div className="order-animate">
        <Table columns={columns} data={orders} emptyMessage="No orders found." />
      </div>

      <Modal isOpen={isPOSModalOpen} onClose={() => setPOSModalOpen(false)} title="Add Order" maxWidth="max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-5 rounded-3xl border border-black/10 bg-primary/5 p-5">
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-primary/50">Customer Details</h4>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Customer Name</label>
              <input
                type="text"
                value={customerForm.name}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter customer name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Phone Number</label>
              <input
                type="text"
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-white p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Address</label>
              <textarea
                value={customerForm.address}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                className="min-h-[110px] w-full rounded-2xl border border-black/10 bg-white p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter customer address"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-black/10 bg-white p-5 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-primary/50">Order Summary</h4>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Order Details / Notes</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Describe the order (e.g. 5kg Cake, Generic Supplies...)"
                  className="min-h-[120px] w-full rounded-2xl border border-black/10 bg-white p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Total Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-primary text-xl">₹</span>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-black/10 bg-white p-4 pl-10 text-2xl font-black text-primary outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-black/10 bg-white p-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Delivery Man</label>
              <select
                value={createDeliverySelection}
                onChange={(e) => setCreateDeliverySelection(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none"
              >
                <option value="">Select delivery man</option>
                <option value="by_self">By Self</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>{w.username}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleCreateOrder}
              className="btn-primary w-full py-5 text-base shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <ShoppingCart size={18} /> CONFIRM ORDER
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function getDeliveryColor(status) {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-primary/40';
    case 'assigned': return 'bg-blue-500 text-white shadow-lg shadow-blue-500/20';
    case 'in-transit': return 'bg-yellow-400 text-primary shadow-lg shadow-yellow-400/20';
    case 'delivered': return 'bg-green-500 text-white shadow-lg shadow-green-500/20';
    default: return 'bg-gray-100 text-gray-800';
  }
}

