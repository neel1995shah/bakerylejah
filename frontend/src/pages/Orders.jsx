import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ShoppingCart, Plus, Minus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import ToastContainer from '../components/ui/ToastContainer.jsx';
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
  const [cart, setCart] = useState([]);
  const [draftProductName, setDraftProductName] = useState('');
  const [draftQty, setDraftQty] = useState('1');
  const [draftUnit, setDraftUnit] = useState('qty');
  const [draftNote, setDraftNote] = useState('');
  const [draftPrice, setDraftPrice] = useState('0');
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

    const socket = io(import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin));
    socket.on('connect', () => {
      if (role) socket.emit('join_room', role);
      socket.emit('join_room', 'manager');
    });
    socket.on('orderCreated', o => {
      setOrders(prev => [o, ...prev]);
      const itemsText = o.items?.map(i => `${i.quantity} ${i.unitType} of ${i.productName}`).join(', ') || 'items';
      addToast('order', `New order #${o._id.slice(-6).toUpperCase()} received`, 'New Order', `Customer: ${o.customer?.name || 'Walk-in'}\n${itemsText}\nTotal: $${o.totalAmount?.toFixed(2)}`);
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
      const res = await axios.put(`/api/orders/${orderId}/status`, { status: 'delivered' });
      setOrders(prev => prev.map(old => old._id === orderId ? res.data : old));
      addToast('success', `Order #${orderId.slice(-6).toUpperCase()} marked as delivered`, 'Order Completed');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to mark order as delivered');
    }
  };

  const addToCart = (invItem, quantity, unitType, note, manualName, manualPrice) => {
    const isCustom = !invItem;
    if (!isCustom && invItem.quantity <= 0) return;

    const qtyToAdd = Number(quantity);
    if (!qtyToAdd || qtyToAdd <= 0) return;

    const linePrice = Number(manualPrice ?? invItem?.product?.basePrice ?? 0);

    const key = isCustom
      ? `custom:${String(manualName || '').trim().toLowerCase()}`
      : invItem.product._id;

    setCart(prev => {
      const existing = prev.find(item => item.key === key);
      if (existing) {
        if (!isCustom && existing.cartQty + qtyToAdd > invItem.quantity) return prev;
        return prev.map(item => item.key === key ? {
          ...item,
          cartQty: item.cartQty + qtyToAdd,
          unitType,
          note: note || item.note,
          price: linePrice
        } : item);
      }

      if (!isCustom && qtyToAdd > invItem.quantity) return prev;

      const normalizedName = isCustom
        ? String(manualName || '').trim()
        : invItem.product.name;

      return [...prev, {
        key,
        product: isCustom ? null : invItem.product,
        productName: normalizedName,
        cartQty: qtyToAdd,
        price: linePrice,
        unitType,
        note: note || ''
      }];
    });
  };

  const handleAddProductLine = () => {
    const productName = draftProductName.trim();
    if (!productName) {
      alert('Please enter product name.');
      return;
    }

    const invItem = inventory.find((i) => (i.product?.name || '').toLowerCase() === productName.toLowerCase());

    if (!invItem) {
      addToCart(null, draftQty, draftUnit, draftNote, productName, draftPrice);
      setDraftProductName('');
      setDraftQty('1');
      setDraftUnit('qty');
      setDraftNote('');
      setDraftPrice('0');
      return;
    }

    addToCart(invItem, draftQty, draftUnit, draftNote, productName, invItem.product?.basePrice || 0);
    setDraftProductName('');
    setDraftQty('1');
    setDraftUnit('qty');
    setDraftNote('');
    setDraftPrice('0');
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.key === productId) {
        const newQty = item.cartQty + delta;
        return newQty > 0 ? { ...item, cartQty: newQty } : item;
      }
      return item;
    }).filter(item => item.cartQty > 0));
  };

  const updateCartUnit = (productId, unitType) => {
    setCart(prev => prev.map(item => (
      item.key === productId ? { ...item, unitType } : item
    )));
  };

  const updateCartNote = (productId, note) => {
    setCart(prev => prev.map(item => (
      item.key === productId ? { ...item, note } : item
    )));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.cartQty * item.price), 0);

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

    if (!name || !phone || !address) {
      alert('Customer name, phone number, and address are required.');
      return;
    }

    if (cart.length === 0) {
      alert('Please add at least one product.');
      return;
    }

    try {
      const orderRes = await axios.post('/api/orders', {
        customerData: { name, phone, address },
        totalAmount: cartTotal,
        items: cart.map(c => ({
          product: c.product?._id,
          productName: c.productName || c.product?.name,
          quantity: c.cartQty,
          price: c.price,
          unitType: c.unitType,
          note: c.note
        }))
      });

      if (createDeliverySelection) {
        const payload = createDeliverySelection === 'by_self'
          ? { deliveryOption: 'by_self' }
          : { deliveryOption: 'worker', workerId: createDeliverySelection };
        await axios.put(`/api/orders/${orderRes.data._id}/confirm`, payload);
      }

      setPOSModalOpen(false);
      setCustomerForm({ name: '', phone: '', address: '' });
      setCreateDeliverySelection('');
      setCart([]);
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
    { header: 'Amount', align: 'right', render: (r) => <span className="font-black text-primary">${r.totalAmount?.toFixed(2)}</span> }
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
            <div className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Product Name</label>
                  <input
                    type="text"
                    list="order-product-list"
                    value={draftProductName}
                    onChange={(e) => setDraftProductName(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none"
                    placeholder="Type product name"
                  />
                  <datalist id="order-product-list">
                    {availableProducts.map((inv) => (
                      <option key={inv._id} value={inv.product?.name || ''} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Unit</label>
                  <select
                    value={draftUnit}
                    onChange={(e) => setDraftUnit(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none"
                  >
                    <option value="qty">QTY</option>
                    <option value="kg">KG</option>
                    <option value="grams">GRAMS</option>
                  </select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      const note = window.prompt('Add product note', draftNote || '');
                      if (note !== null) setDraftNote(note);
                    }}
                    className="rounded-xl border border-black/10 bg-yellow-100 px-3 py-2 text-xs font-black uppercase tracking-wider text-primary"
                  >
                    Add Note
                  </button>
                  {draftNote && <p className="text-xs font-semibold text-primary/60">Note set</p>}
                  <button
                    type="button"
                    onClick={handleAddProductLine}
                    className="sm:ml-auto rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-secondary"
                  >
                    Add Product
                  </button>
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

            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.key} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="font-black text-primary tracking-tight">{item.productName || item.product?.name}</p>
                    <p className="font-black text-primary">${item.price.toFixed(2)}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-2">
                      <button type="button" onClick={() => updateCartQty(item.key, -1)} className="rounded-lg p-2 hover:bg-white">
                        <Minus size={14} />
                      </button>
                      <span className="w-full text-center text-sm font-black">{item.cartQty}</span>
                      <button type="button" onClick={() => updateCartQty(item.key, 1)} className="rounded-lg p-2 hover:bg-white">
                        <Plus size={14} />
                      </button>
                    </div>

                    <select
                      value={item.unitType}
                      onChange={(e) => updateCartUnit(item.key, e.target.value)}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold text-primary outline-none"
                    >
                      <option value="qty">QTY</option>
                      <option value="kg">KG</option>
                      <option value="grams">GRAMS</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const note = window.prompt(`Add note for ${item.productName || item.product?.name}`, item.note || '');
                        if (note !== null) updateCartNote(item.key, note);
                      }}
                      className="rounded-xl border border-black/10 bg-yellow-100 px-3 py-2 text-sm font-black uppercase tracking-wider text-primary"
                    >
                      Add Note
                    </button>
                  </div>

                  {item.note && (
                    <p className="mt-2 rounded-lg bg-primary/5 px-3 py-2 text-xs font-semibold text-primary/70">
                      Note: {item.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-black/10 bg-primary/5 px-4 py-3">
              <div className="flex items-end justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Total</span>
                <span className="text-3xl font-black tracking-tighter text-primary">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateOrder}
              className="btn-primary w-full py-5 text-base"
              disabled={cart.length === 0}
            >
              <ShoppingCart size={18} /> Create Order
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

