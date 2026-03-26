import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Search, Edit, Trash2, Plus, AlertTriangle } from 'lucide-react';
import Table from '../components/ui/Table.jsx';
import Modal from '../components/ui/Modal.jsx';

export default function Inventory() {
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    basePrice: '',
    category: '',
    quantity: '',
    unit: 'pcs',
    reorderLevel: 10
  });

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const res = await axios.get('http://localhost:5000/api/inventory');
      setInventory(res.data);
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
      fetchInventory(); // Refresh list to get new product's inventory record
    } catch (err) {
      console.error('Failed to add product', err);
      alert('Error adding product.');
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;
    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}`);
      fetchInventory();
    } catch (err) {
      console.error("Failed to delete", err);
      alert('Error deleting product.');
    }
  };

  const columns = [
    { header: 'Product Name', render: (r) => <span className="font-semibold text-gray-800">{r.product?.name || 'Unknown'}</span> },
    { header: 'Category', render: (r) => <span className="text-sm text-gray-500">{r.product?.category || 'N/A'}</span> },
    { header: 'Price', render: (r) => <span className="text-sm text-gray-500">${r.product?.basePrice?.toFixed(2) || '0.00'}</span> },
    { header: 'In Stock', align: 'center', render: (r) => {
        const isLow = r.quantity <= r.reorderLevel;
        return <span className={`font-bold ${isLow ? 'text-red-500' : 'text-gray-800'}`}>{r.quantity} {r.unit}</span>
    }},
    { header: 'Reorder Level', align: 'center', render: (r) => <span className="text-gray-500">{r.reorderLevel}</span> },
    { header: 'Actions', align: 'right', render: (r) => (
      <div className="flex justify-end gap-2">
        <button 
          onClick={() => openUpdateModal(r)}
          className="text-primary hover:bg-primary/10 p-2 rounded transition-colors inline-block"
          title="Update Stock"
        >
          <Edit size={16} />
        </button>
        <button 
          onClick={() => handleDeleteProduct(r.product?._id)}
          className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors inline-block"
          title="Delete Product"
        >
          <Trash2 size={16} />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">

      {/* Low Stock Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex items-start">
            <AlertTriangle className="text-red-500 mr-3 mt-0.5" size={24} />
            <div>
              <h3 className="text-red-800 font-bold text-lg mb-1">Stock Alerts</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {outOfStockItems.map(i => (
                  <li key={i._id} className="font-bold">OUT OF STOCK: {i.product?.name || 'Unknown item'}</li>
                ))}
                {lowStockItems.map(i => (
                  <li key={i._id}>Low stock: {i.product?.name || 'Unknown item'} ({i.quantity} left)</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-surface p-6 rounded-xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Inventory Management</h2>
          <p className="text-sm text-gray-500 mt-1">Track, filter, and adjust warehouse stock instantly.</p>
        </div>
        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search items..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-olive-dark text-white font-bold py-2 px-4 rounded-lg transition-colors border-2 border-primary hover:border-olive-dark whitespace-nowrap"
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      <Table columns={columns} data={filtered} emptyMessage="No matching inventory found." />

      {/* Update Stock Modal */}
      <Modal isOpen={isUpdateModalOpen} onClose={() => setUpdateModalOpen(false)} title="Update Stock Quantity">
        {selectedItem && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Editing stock for: <strong className="text-gray-800">{selectedItem.product?.name}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Quantity</label>
              <input 
                type="number" 
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button 
              onClick={handleUpdateStock}
              className="w-full mt-4 bg-primary text-white font-bold py-2.5 rounded-lg hover:bg-olive-dark transition"
            >
              Confirm Update
            </button>
          </div>
        )}
      </Modal>

      {/* Add Product Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Product">
        <form onSubmit={handleAddProduct} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Product Name</label>
              <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Organic Bananas" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
              <textarea value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary h-20" placeholder="Product details..."></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
              <input required type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Produce" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Base Price ($)</label>
              <input required type="number" step="0.01" min="0" value={newProduct.basePrice} onChange={e => setNewProduct({...newProduct, basePrice: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary" placeholder="0.00" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Initial Quantity</label>
              <input required type="number" min="0" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary" placeholder="100" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Unit</label>
              <input required type="text" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary" placeholder="pcs, kg, lbs..." />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Reorder Level Alert Threshold</label>
              <input required type="number" min="0" value={newProduct.reorderLevel} onChange={e => setNewProduct({...newProduct, reorderLevel: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-primary" placeholder="10" />
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100 mt-6">
            <button type="button" onClick={() => setAddModalOpen(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-olive-dark transition">Save Product</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}