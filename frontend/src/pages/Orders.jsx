import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ShoppingCart, UserPlus, Plus, Minus, Search, Trash2, Package, User, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import gsap from 'gsap';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);

  const [isAssignModalOpen, setAssignModal] = useState(false);
  const [isPOSModalOpen, setPOSModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  // POS State
  const [cart, setCart] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [posStep, setPosStep] = useState(1); // 1: Customer, 2: Products, 3: Review

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchData = async () => {
      try {
        const [ordersRes, workersRes, custRes, invRes] = await Promise.all([
          axios.get('http://localhost:5000/api/orders'),
          axios.get('http://localhost:5000/api/auth/users?role=worker'),
          axios.get('http://localhost:5000/api/customers'),
          axios.get('http://localhost:5000/api/inventory')
        ]);
        setOrders(ordersRes.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setWorkers(workersRes.data);
        setCustomers(custRes.data);
        setInventory(invRes.data);
        
        gsap.fromTo(".order-animate", 
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out" }
        );
      } catch (error) {
        console.error("Failed to load initial data", error);
      }
    };
    fetchData();

    const socket = io('http://localhost:5000');
    socket.on('connect', () => socket.emit('join_room', 'manager'));
    socket.on('orderCreated', o => setOrders(prev => [o, ...prev]));
    socket.on('workerAssigned', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryStarted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryCompleted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('stockUpdated', inv => setInventory(prev => prev.map(old => old._id === inv._id ? inv : old)));

    return () => socket.disconnect();
  }, []);

  const handleAssignWorker = async () => {
    if (!selectedWorkerId) return;
    try {
      await axios.put(`http://localhost:5000/api/orders/${selectedOrderId}/assign`, { workerId: selectedWorkerId });
      setAssignModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (invItem) => {
    if (invItem.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.product._id === invItem.product._id);
      if (existing) {
        if (existing.cartQty >= invItem.quantity) return prev;
        return prev.map(item => item.product._id === invItem.product._id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prev, { product: invItem.product, cartQty: 1, price: invItem.product.basePrice }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product._id === productId) {
        const newQty = item.cartQty + delta;
        return newQty > 0 ? { ...item, cartQty: newQty } : item;
      }
      return item;
    }).filter(item => item.cartQty > 0));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.cartQty * item.price), 0);

  const handleCreateOrder = async () => {
    try {
      await axios.post('http://localhost:5000/api/orders', {
        customerId: selectedCustomerId,
        totalAmount: cartTotal,
        items: cart.map(c => ({ product: c.product._id, quantity: c.cartQty, price: c.price }))
      });
      setPOSModalOpen(false);
      setSelectedCustomerId('');
      setCart([]);
      setPosStep(1);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = inventory.filter(inv => 
    inv.product?.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    inv.product?.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

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
        !r.assignedWorker ? (
          <button
            onClick={() => { setSelectedOrderId(r._id); setAssignModal(true); }}
            className="text-[10px] font-black text-secondary bg-primary px-4 py-2 rounded-xl hover:scale-105 transition-transform uppercase tracking-widest"
          >
            Assign
          </button>
        ) : (
          <div className="flex items-center gap-2 justify-center">
            <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-[10px] font-black text-primary">
              {r.assignedWorker.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-primary/60">{r.assignedWorker.username}</span>
          </div>
        )
      )
    },
    { header: 'Amount', align: 'right', render: (r) => <span className="font-black text-primary">${r.totalAmount?.toFixed(2)}</span> }
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="order-animate flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tight">Order Flows</h1>
          <p className="text-primary/40 font-medium">Manage logistics and retail operations.</p>
        </div>
        <button
          onClick={() => setPOSModalOpen(true)}
          className="btn-primary w-full md:w-auto"
        >
          <ShoppingCart size={20} /> LAUNCH POS
        </button>
      </div>

      <div className="order-animate">
        <Table columns={columns} data={orders} emptyMessage="No orders found." />
      </div>

      {/* Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setAssignModal(false)} title="Dispatch Resource">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Select Field Worker</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full bg-primary/5 border border-black/5 rounded-[2rem] p-5 font-bold text-primary outline-none focus:ring-2 focus:ring-primary appearance-none"
            >
              <option value="" disabled>-- Availability List --</option>
              {workers.map(w => <option key={w._id} value={w._id}>{w.username}</option>)}
            </select>
          </div>
          <button onClick={handleAssignWorker} className="btn-primary w-full py-5 text-lg">CONFIRM DISPATCH</button>
        </div>
      </Modal>

      {/* POS Modal - High Octane Redesign */}
      <Modal isOpen={isPOSModalOpen} onClose={() => setPOSModalOpen(false)} title="Point of Sale" maxWidth="max-w-6xl">
        <div className="flex flex-col h-[70vh]">
          {/* Mobile Step Progress */}
          <div className="flex lg:hidden justify-between items-center mb-6 px-2">
            {[1, 2, 3].map(step => (
              <div key={step} className={`flex-1 h-2 rounded-full mx-1 transition-all duration-500 ${posStep >= step ? 'bg-primary' : 'bg-primary/10'}`} />
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
            {/* Steps / Navigation Logic */}
            {/* Step 1: Customer Selection (Always visible on desktop left or mobile step 1) */}
            {(posStep === 1 || window.innerWidth > 1024) && (
              <div className={`flex flex-col gap-6 ${posStep === 1 ? 'flex-1' : 'w-80 hidden lg:flex'} transition-all`}>
                <div className="p-6 bg-primary/5 rounded-[2.5rem] border border-black/5">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 mb-4">Target Customer</h4>
                  <div className="grid grid-cols-1 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                    {customers.map(c => (
                      <button 
                        key={c._id} 
                        onClick={() => setSelectedCustomerId(c._id)}
                        className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${selectedCustomerId === c._id ? 'bg-primary text-secondary border-primary shadow-xl scale-[1.02]' : 'bg-white/50 border-black/5 text-primary hover:bg-white hover:border-black/10'}`}
                      >
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedCustomerId === c._id ? 'bg-secondary/20 text-secondary' : 'bg-primary/5 text-primary'}`}>
                            <User size={14} />
                         </div>
                         <span className="font-bold tracking-tight">{c.name}</span>
                      </button>
                    ))}
                    <button className="p-4 rounded-2xl border-2 border-dashed border-black/10 text-primary/30 font-black text-xs uppercase hover:border-primary/20 hover:text-primary transition-all flex items-center justify-center gap-2">
                      <UserPlus size={16} /> New Prospect
                    </button>
                  </div>
                </div>
                {posStep === 1 && (
                   <button 
                    disabled={!selectedCustomerId}
                    onClick={() => setPosStep(2)}
                    className="lg:hidden btn-primary w-full py-5 rounded-[2rem] disabled:opacity-30"
                   >
                     NEXT: ADD ITEMS <ChevronRight size={18} />
                   </button>
                )}
              </div>
            )}

            {/* Step 2: Catalog (Center on desktop, step 2 on mobile) */}
            {(posStep === 2 || window.innerWidth > 1024) && (
              <div className={`flex-1 flex flex-col gap-6 ${posStep === 2 ? 'flex' : 'hidden lg:flex'} overflow-hidden`}>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search logistics network..." 
                    className="w-full pl-14 pr-6 py-5 bg-white/50 border border-black/5 rounded-[2rem] font-black text-primary outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto pr-2 pb-6">
                  {filteredProducts.map(inv => (
                    <button 
                      key={inv._id} 
                      disabled={inv.quantity <= 0}
                      onClick={() => addToCart(inv)}
                      className={`group p-4 rounded-[2rem] border transition-all text-left flex flex-col justify-between h-[120px] ${inv.quantity > 0 ? 'bg-white/80 border-black/5 hover:scale-[1.02] hover:shadow-xl hover:border-primary/20' : 'bg-black/5 border-transparent opacity-40 grayscale'}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                           <span className="text-[10px] font-black uppercase text-primary/30 tracking-widest">{inv.product?.category}</span>
                           <Package size={14} className="text-primary/10 group-hover:text-primary/30 transition-colors" />
                        </div>
                        <p className="font-extrabold text-primary leading-[1.1] tracking-tighter text-lg">{inv.product?.name}</p>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xl font-black text-primary">${inv.product?.basePrice?.toFixed(2)}</span>
                        <div className="px-2 py-0.5 bg-primary/5 rounded-full text-[10px] font-black text-primary/40 uppercase">
                          {inv.quantity} left
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {posStep === 2 && (
                   <div className="lg:hidden flex gap-4">
                      <button onClick={() => setPosStep(1)} className="p-5 bg-primary/5 text-primary rounded-[2rem]"><ArrowLeft size={24}/></button>
                      <button 
                        disabled={cart.length === 0}
                        onClick={() => setPosStep(3)}
                        className="btn-primary flex-1 py-5 rounded-[2rem] disabled:opacity-30"
                      >
                         REVIEW CART ({cart.length})
                      </button>
                   </div>
                )}
              </div>
            )}

            {/* Step 3: cart & review (Right on desktop, Step 3 on mobile) */}
            {(posStep === 3 || window.innerWidth > 1024) && (
              <div className={`transition-all ${posStep === 3 ? 'flex-1 flex flex-col' : 'lg:w-[400px] hidden lg:flex flex-col'} bg-primary/5 rounded-[3rem] p-8 border border-black/5 relative`}>
                <div className="flex justify-between items-center mb-6">
                   <h4 className="text-xl font-black text-primary tracking-tight">Summary</h4>
                   <span className="bg-primary text-secondary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{cart.length} ITEMS</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 mb-8 pr-2">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-primary/20 text-center px-6">
                      <ShoppingCart size={48} className="mb-4 stroke-[1.5]" />
                      <p className="text-sm font-bold uppercase tracking-widest italic opacity-50">Operational cycle empty</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.product._id} className="flex justify-between items-center p-5 bg-white/70 backdrop-blur rounded-[2rem] border border-white shadow-sm group">
                        <div className="flex-1 truncate">
                          <p className="font-black text-primary tracking-tight truncate mr-2">{item.product.name}</p>
                          <p className="text-[10px] font-black text-primary/30 uppercase tracking-widest">${item.price.toFixed(2)} unit</p>
                        </div>
                        <div className="flex items-center gap-1 bg-primary/5 rounded-2xl p-1 shadow-inner">
                          <button onClick={() => updateCartQty(item.product._id, -1)} className="p-2 hover:bg-white rounded-xl text-primary transition-all"><Minus size={14}/></button>
                          <span className="w-6 text-center font-black text-primary text-sm">{item.cartQty}</span>
                          <button onClick={() => updateCartQty(item.product._id, 1)} className="p-2 hover:bg-white rounded-xl text-primary transition-all"><Plus size={14}/></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-6">
                   <div className="flex justify-between items-end px-2">
                      <span className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em]">Total Revenue</span>
                      <span className="text-5xl font-black text-primary tracking-tighter">${cartTotal.toFixed(2)}</span>
                   </div>
                   
                   <div className="flex gap-4">
                      {posStep === 3 && <button onClick={() => setPosStep(2)} className="lg:hidden p-5 bg-primary/5 text-primary rounded-[2rem]"><ArrowLeft size={24}/></button>}
                      <button
                        onClick={handleCreateOrder}
                        disabled={cart.length === 0 || !selectedCustomerId}
                        className="btn-primary flex-1 py-6 text-xl rounded-[2.5rem] disabled:opacity-40 group"
                      >
                        {posStep === 3 || window.innerWidth > 1024 ? <><CheckCircle size={22} /> FINALIZE TRANSACTION</> : 'CONTINUE'}
                      </button>
                   </div>
                </div>
              </div>
            )}
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