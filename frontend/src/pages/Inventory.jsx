import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Search, Edit, Trash2, Plus, AlertTriangle, Package, ChevronRight } from 'lucide-react';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';
import gsap from 'gsap';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newProduct, setNewProduct] = useState({
    name: '', description: '', basePrice: '', category: '', quantity: '', unit: 'pcs', reorderLevel: 10
  });

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const res = await axios.get('http://localhost:5000/api/inventory');
      setInventory(res.data);
      
      // GSAP Animation
      gsap.fromTo(".inv-animate", 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: "power2.out" }
      );
    } catch (error) {
      console.error("Failed to load inventory", error);
    }
  };

  useEffect(() => {
    fetchInventory();
    const socket = io('http://localhost:5000');
    socket.on('stockUpdated', inv => {
      setInventory(prev => prev.map(o => o._id === inv._id ? inv : o));
    });
    return () => socket.disconnect();
  }, []);

  const filtered = inventory.filter(i => 
    i.product?.name?.toLowerCase().includes(search.toLowerCase()) || 
    i.product?.category?.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockItems = inventory.filter(i => i.quantity <= i.reorderLevel && i.quantity > 0);
  const outOfStockItems = inventory.filter(i => i.quantity === 0);

  const openUpdateModal = (item) => {
    setSelectedItem(item);
    setNewQuantity(item.quantity);
    setUpdateModalOpen(true);
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;
    try {
      await axios.put(`http://localhost:5000/api/inventory/${selectedItem._id}`, {
        quantity: Number(newQuantity)
      });
      setUpdateModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/products', newProduct);
      setAddModalOpen(false);
      setNewProduct({
        name: '', description: '', basePrice: '', category: '', quantity: '', unit: 'pcs', reorderLevel: 10
      });
      fetchInventory();
    } catch (err) {
      console.error('Failed to add product', err);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}`);
      fetchInventory();
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const columns = [
    { 
      header: 'Product', 
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
            <Package size={18} />
          </div>
          <div>
            <p className="font-black text-primary tracking-tight">{r.product?.name || 'Unknown'}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/30">{r.product?.category || 'General'}</p>
          </div>
        </div>
      )
    },
    { header: 'Price', render: (r) => <span className="font-bold text-primary/60">${r.product?.basePrice?.toFixed(2)}</span> },
    { 
      header: 'Availability', 
      align: 'center', 
      render: (r) => {
        const isLow = r.quantity <= r.reorderLevel;
        return (
          <div className="flex flex-col items-center">
            <span className={`text-lg font-black tracking-tighter ${isLow ? 'text-red-500 underline decoration-2 underline-offset-4' : 'text-primary'}`}>
              {r.quantity}
            </span>
            <span className="text-[10px] font-black uppercase text-primary/20">{r.unit}</span>
          </div>
        )
      }
    },
    { 
      header: 'Actions', 
      align: 'right', 
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => openUpdateModal(r)}
            className="p-3 bg-primary/5 text-primary rounded-2xl hover:bg-primary hover:text-secondary transition-all active:scale-90"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => handleDeleteProduct(r.product?._id)}
            className="p-3 bg-red-500/5 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="inv-animate glass-card !border-red-500/20 !bg-red-500/5 p-6 flex items-start gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-red-600 tracking-tight">Supply Chain Warning</h3>
            <p className="text-red-600/60 text-sm font-medium">Multiple items have reached critical thresholds.</p>
          </div>
        </div>
      )}

      {/* Hero / Filters */}
      <div className="inv-animate flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tight">Inventory</h1>
          <p className="text-primary/40 font-medium">Real-time stock management & logistics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={18} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              className="w-full pl-12 pr-4 py-4 bg-white/50 border border-black/5 rounded-[2rem] focus:ring-2 focus:ring-primary outline-none font-bold text-primary placeholder:text-primary/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setAddModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={20} /> NEW PRODUCT
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="inv-animate">
        <Table columns={columns} data={filtered} emptyMessage="No matching inventory found." />
      </div>

      {/* Update Stock Modal */}
      <Modal isOpen={isUpdateModalOpen} onClose={() => setUpdateModalOpen(false)} title="Adjust Stock">
        {selectedItem && (
          <div className="space-y-6">
            <div className="p-6 bg-primary/5 rounded-[2rem] border border-black/5">
               <p className="text-[10px] font-black uppercase text-primary/30 tracking-widest mb-1">Editing Resource</p>
               <h4 className="text-xl font-black text-primary tracking-tight">{selectedItem.product?.name}</h4>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 pl-4">Physical Count</label>
              <input 
                type="number" 
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-full bg-primary/5 border border-black/5 rounded-[2rem] p-5 font-black text-3xl tracking-tighter text-primary outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button 
              onClick={handleUpdateStock}
              className="btn-primary w-full py-5 text-lg"
            >
              UPDATE QUANTITY
            </button>
          </div>
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Onboard Product">
        <form onSubmit={handleAddProduct} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Product Name</label>
              <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Sourdough Loaf" />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Category</label>
                  <input required type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary" placeholder="Breads" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Price ($)</label>
                  <input required type="number" step="0.01" value={newProduct.basePrice} onChange={e => setNewProduct({...newProduct, basePrice: e.target.value})} className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Initial Qty</label>
                  <input required type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary" placeholder="0" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Unit</label>
                  <input required type="text" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary" placeholder="pcs" />
               </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary/40 ml-4">Low Stock Warning Threshold</label>
              <input required type="number" value={newProduct.reorderLevel} onChange={e => setNewProduct({...newProduct, reorderLevel: e.target.value})} className="w-full bg-primary/5 border border-black/5 rounded-2xl p-4 font-bold text-primary outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="submit" className="flex-1 btn-primary py-5">REGISTER PRODUCT</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}