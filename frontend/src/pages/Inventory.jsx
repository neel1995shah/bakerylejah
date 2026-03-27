import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Search, Plus, Eye, Heart, IndianRupee, Package } from 'lucide-react';
import Modal from '../components/ui/Modal.jsx';
import gsap from 'gsap';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?q=80&w=800&auto=format&fit=crop';
const ADMIN_ROLES = ['owner', 'sub_manager', 'manager'];

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    quantitySize: '',
    price: '',
    imageUrl: '',
    imageFile: null
  });
  const [isUploading, setIsUploading] = useState(false);

  const role = localStorage.getItem('role');
  const isAdmin = ADMIN_ROLES.includes(role);

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;

    try {
      const res = await axios.get('http://localhost:5000/api/inventory');
      setInventory(res.data || []);

      gsap.fromTo(
        '.inventory-card',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out' }
      );
    } catch (error) {
      console.error('Failed to load inventory', error);
    }
  };

  useEffect(() => {
    fetchInventory();

    const socket = io('http://localhost:5000');
    socket.on('stockUpdated', (inv) => {
      setInventory((prev) => prev.map((i) => (i._id === inv._id ? inv : i)));
    });

    return () => socket.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return inventory.filter((item) => {
      const name = item.product?.name?.toLowerCase() || '';
      const size = item.product?.quantitySize?.toLowerCase() || '';
      return name.includes(q) || size.includes(q);
    });
  }, [inventory, search]);

  const handleAddProduct = async (e) => {
    e.preventDefault();

    try {
      if (!newProduct.imageFile) {
        alert('Please choose an image file first.');
        return;
      }

      setIsUploading(true);

      const formData = new FormData();
      formData.append('image', newProduct.imageFile);

      const uploadRes = await axios.post('http://localhost:5000/api/uploads/image', formData);

      await axios.post('http://localhost:5000/api/products', {
        name: newProduct.name.trim(),
        quantitySize: newProduct.quantitySize.trim(),
        price: Number(newProduct.price),
        imageUrl: uploadRes.data?.url || ''
      });

      setNewProduct({ name: '', quantitySize: '', price: '', imageUrl: '', imageFile: null });
      setAddModalOpen(false);
      fetchInventory();
    } catch (err) {
      console.error('Failed to add product', err);
      alert(err?.response?.data?.message || 'Failed to add product');
    } finally {
      setIsUploading(false);
    }
  };

  const formatPrice = (value) => {
    const amount = Number(value || 0);
    return amount.toLocaleString('en-IN');
  };

  const productCount = filtered.length;

  return (
    <div className="space-y-6 pb-10">
      <div className="inventory-hero flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-primary">Inventory</h1>
          <p className="font-medium text-primary/50">Premium product catalog and stock records.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <div className="relative min-w-[280px] flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/30" size={18} />
            <input
              type="text"
              placeholder="Search product or size"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-white/70 py-3 pl-11 pr-4 font-semibold text-primary outline-none ring-primary/20 focus:ring-2"
            />
          </div>

          {isAdmin && (
            <button onClick={() => setAddModalOpen(true)} className="btn-primary whitespace-nowrap">
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
        <p className="text-sm font-bold uppercase tracking-wider text-primary/50">Total Items</p>
        <p className="text-2xl font-black tracking-tighter text-primary">{productCount}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:gap-5">
        {filtered.map((item) => {
          const product = item.product || {};
          const imageSrc = product.imageUrl || FALLBACK_IMAGE;
          const activeTag = item.quantity > 0 ? 'ACTIVE' : 'OUT';
          const pseudoViews = Math.max(120, Number(String(product._id || '').slice(-3)) || 0);

          return (
            <article key={item._id} className="inventory-card overflow-hidden rounded-[1.2rem] border border-black/10 bg-white shadow-sm">
              <div className="relative h-[150px] w-full bg-slate-100 sm:h-[190px]">
                <img src={imageSrc} alt={product.name || 'Product'} className="h-full w-full object-cover" />

                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black tracking-wider text-black">{activeTag}</span>
                </div>

                <div className="absolute right-3 top-3 flex items-center gap-2">
                  <button type="button" className="rounded-full bg-white/90 p-2 text-slate-500">
                    <Heart size={14} />
                  </button>
                  <span className="flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                    <Eye size={12} /> {pseudoViews}
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                <h3 className="line-clamp-1 text-lg font-black tracking-tight text-[#1b1b35] sm:text-[1.9rem] sm:leading-[1.1]">{product.name || 'Unnamed Product'}</h3>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-100 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Size/Grams</p>
                    <p className="line-clamp-1 text-sm font-bold text-slate-800">{product.quantitySize || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stock Qty</p>
                    <p className="text-sm font-bold text-slate-800">{item.quantity} {item.unit || 'pcs'}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Price</p>
                    <p className="flex items-center text-3xl font-black tracking-tighter text-[#1b1b35]">
                      <IndianRupee size={22} />
                      {formatPrice(product.basePrice)}
                    </p>
                  </div>

                  <button type="button" className="inline-flex items-center gap-1 rounded-xl border border-black/15 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#1b1b35]">
                    <Package size={14} /> Details
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/20 bg-white/60 py-14 text-center">
          <p className="text-sm font-black uppercase tracking-wider text-primary/40">No products found</p>
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add Product" maxWidth="max-w-xl">
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-primary/40">Product Name</label>
            <input
              required
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full rounded-xl border border-black/10 bg-primary/5 p-3.5 font-semibold text-primary outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Premium Almond Cookies"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-primary/40">Quantity / Size / Grams</label>
            <input
              required
              type="text"
              value={newProduct.quantitySize}
              onChange={(e) => setNewProduct({ ...newProduct, quantitySize: e.target.value })}
              className="w-full rounded-xl border border-black/10 bg-primary/5 p-3.5 font-semibold text-primary outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: 500g, 1kg, 12 pcs"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-primary/40">Price (INR)</label>
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              className="w-full rounded-xl border border-black/10 bg-primary/5 p-3.5 font-semibold text-primary outline-none focus:ring-2 focus:ring-primary"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-primary/40">Product Image</label>
            <input
              required
              type="file"
              accept="image/*"
              onChange={(e) => setNewProduct({ ...newProduct, imageFile: e.target.files?.[0] || null })}
              className="w-full rounded-xl border border-black/10 bg-primary/5 p-3.5 font-semibold text-primary outline-none focus:ring-2 focus:ring-primary"
            />
            {newProduct.imageFile && (
              <p className="text-xs font-semibold text-primary/60">Selected: {newProduct.imageFile.name}</p>
            )}
          </div>

          <button type="submit" disabled={isUploading} className="btn-primary w-full justify-center py-4 text-sm disabled:opacity-60">
            <Plus size={16} /> {isUploading ? 'Uploading...' : 'Save Product'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
