import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { ShoppingCart, UserPlus, Plus, Minus, Search, Trash2 } from 'lucide-react';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';

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
    
    socket.on('stockUpdated', inv => {
      setInventory(prev => prev.map(old => old._id === inv._id ? inv : old));
    });

    return () => socket.disconnect();
  }, []);

  // --- Assign Worker Actions ---
  const handleAssignWorker = async () => {
    if (!selectedWorkerId) return;
    try {
      await axios.put(`http://localhost:5000/api/orders/${selectedOrderId}/assign`, {  
        workerId: selectedWorkerId
      });
      setAssignModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const openAssignModal = (orderId) => {
    setSelectedOrderId(orderId);
    setSelectedWorkerId('');
    setAssignModal(true);
  };

  // --- POS Actions ---
  const addToCart = (invItem) => {
    if (invItem.quantity <= 0) return alert('Out of stock!');
    setCart(prev => {
      const existing = prev.find(item => item.product._id === invItem.product._id);
      if (existing) {
        // Assume unrestricted cart addition for demo, proper app would check stock limit here too
        if (existing.cartQty >= invItem.quantity) {
          alert('Cannot add more than available stock.');
          return prev;
        }
        return prev.map(item => item.product._id === invItem.product._id 
          ? { ...item, cartQty: item.cartQty + 1 } 
          : item);
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
    if (!selectedCustomerId) return alert('Please select a customer.');
    if (cart.length === 0) return alert('Cart is empty.');
    
    try {
      const itemsPayload = cart.map(c => ({
        product: c.product._id,
        quantity: c.cartQty,
        price: c.price
      }));

      await axios.post('http://localhost:5000/api/orders', {
        customerId: selectedCustomerId,
        totalAmount: cartTotal,
        items: itemsPayload
      });
      
      // Stock deductions typically happen on backend. Assuming backend handles it, or ignoring for demo context
      
      setPOSModalOpen(false);
      setSelectedCustomerId('');
      setCart([]);
    } catch (err) {
      console.error(err);
      alert('Failed to create order');
    }
  };

  // --- Render lists ---
  const filteredProducts = inventory.filter(inv => 
    inv.product?.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    inv.product?.category?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const columns = [
    { header: 'Order ID', render: (row) => <span className="font-mono text-xs text-gray-500">#{row._id.slice(-6).toUpperCase()}</span> },
    { header: 'Date', render: (row) => <span className="text-sm">{new Date(row.createdAt).toLocaleDateString()}</span> },
    { header: 'Customer', accessor: 'customer.name', render: (r) => <span className="font-medium">{r.customer?.name || 'Unknown'}</span> },
    { header: 'Delivery Status', align: 'center', render: (row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${getDeliveryColor(row.deliveryStatus)}`}>
        {row.deliveryStatus}
      </span>
    )},
    { header: 'Worker', align: 'center', render: (row) => (
      row.deliveryStatus === 'pending' || !row.assignedWorker ? (
        <button
          onClick={() => openAssignModal(row._id)}
          className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1 rounded"
        >
          Assign Worker
        </button>
      ) : (
        <span className="text-sm text-gray-700">{row.assignedWorker.username}</span>   
      )
    )},
    { header: 'Total', align: 'right', render: (row) => <span className="font-bold">${row.totalAmount?.toFixed(2)}</span> }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Order Management</h2>       
          <p className="text-sm text-gray-500 mt-1">Live order tracking and POS checkout</p>
        </div>
        <button
          onClick={() => setPOSModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-bold hover:bg-olive-dark transition-colors shadow-md shadow-primary/20"
        >
          <ShoppingCart size={18} />
          New POS Order
        </button>
      </div>

      <Table columns={columns} data={orders} emptyMessage="No orders found." />        

      {/* Assign Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setAssignModal(false)} title="Assign Delivery Worker">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select a Worker</label>
          <select
            value={selectedWorkerId}
            onChange={(e) => setSelectedWorkerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>-- Select Worker --</option>
            {workers.map(w => <option key={w._id} value={w._id}>{w.username}</option>)}
          </select>
          <button
            onClick={handleAssignWorker}
            className="w-full mt-4 bg-secondary text-white font-bold py-2.5 rounded-lg hover:bg-yellow-600 transition"
          >
            Confirm Assignment
          </button>
        </div>
      </Modal>

      {/* POS Modal */}
      <Modal isOpen={isPOSModalOpen} onClose={() => setPOSModalOpen(false)} title="POS Order Checkout" maxWidth="max-w-5xl">
        <div className="flex flex-col md:flex-row gap-6 h-full">
          
          {/* Left: Product Selection */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[50vh] pr-2">
              {filteredProducts.map(inv => (
                <div 
                  key={inv._id} 
                  onClick={() => addToCart(inv)}
                  className={`border rounded-xl p-3 cursor-pointer transition-all ${inv.quantity > 0 ? 'hover:border-primary hover:shadow-md bg-white' : 'opacity-50 bg-gray-50'}`}
                >
                  <p className="font-bold text-gray-800 leading-tight mb-1">{inv.product?.name}</p>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-primary font-bold">${inv.product?.basePrice?.toFixed(2)}</span>
                    <span className={`text-xs ${inv.quantity > 0 ? 'text-gray-500' : 'text-red-500 font-bold'}`}>
                      {inv.quantity > 0 ? `${inv.quantity} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <p className="text-gray-500 col-span-full">No products found.</p>
              )}
            </div>
          </div>

          {/* Right: Cart and Checkout */}
          <div className="md:w-96 flex flex-col bg-gray-50 rounded-xl p-4 border border-gray-100 h-full">
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="" disabled>-- Select Customer --</option>
                {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[25vh] bg-white rounded-lg border border-gray-100 p-2 mb-4 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                  <ShoppingCart size={32} />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product._id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg border border-gray-50">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{item.product.name}</p>
                      <p className="text-xs text-gray-500">${item.price.toFixed(2)} ea</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button onClick={() => updateCartQty(item.product._id, -1)} className="p-1 hover:bg-white rounded text-gray-600"><Minus size={14}/></button>
                      <span className="w-4 text-center font-bold text-sm">{item.cartQty}</span>
                      <button onClick={() => updateCartQty(item.product._id, 1)} className="p-1 hover:bg-white rounded text-gray-600"><Plus size={14}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-4 mt-auto">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-600">Total</span>
                <span className="text-2xl font-bold text-gray-800">${cartTotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handleCreateOrder}
                disabled={cart.length === 0 || !selectedCustomerId}
                className="w-full bg-primary disabled:bg-gray-400 text-white font-bold py-3 rounded-xl hover:bg-olive-dark transition-colors shadow-md flex justify-center items-center gap-2"
              >
                Checkout & Create Order
              </button>
            </div>
          </div>

        </div>
      </Modal>
    </div>
  );
}

function getDeliveryColor(status) {
  switch (status) {
    case 'pending': return 'bg-gray-200 text-gray-800';
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'in-transit': return 'bg-yellow-100 text-yellow-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}