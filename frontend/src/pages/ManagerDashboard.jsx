import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Package, TrendingUp, AlertTriangle, CheckCircle, Truck } from 'lucide-react';

export default function ManagerDashboard() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchData = async () => {
      try {
        const [ordersRes, invRes] = await Promise.all([
          axios.get('http://localhost:5000/api/orders'),
          axios.get('http://localhost:5000/api/inventory')
        ]);
        setOrders(ordersRes.data);
        setInventory(invRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchData();

    const socket = io('http://localhost:5000');
    socket.on('connect', () => socket.emit('join_room', 'manager'));
    socket.on('orderCreated', o => setOrders(prev => [...prev, o]));
    socket.on('workerAssigned', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryStarted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('deliveryCompleted', o => setOrders(prev => prev.map(old => old._id === o._id ? o : old)));
    socket.on('stockUpdated', inv => setInventory(prev => prev.map(old => old._id === inv._id ? inv : old)));

    return () => socket.disconnect();
  }, []);

  const totalDues = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
  const activeOrders = orders.filter(o => o.deliveryStatus !== 'delivered').length;
  const lowStock = inventory.filter(i => i.quantity <= i.reorderLevel).length;

  return (
    <div className="space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Active Orders" value={activeOrders} icon={<Truck color="#C9971A" size={28}/>} />
        <StatCard title="Total Expected Revenue" value={`$${totalDues.toFixed(2)}`} icon={<TrendingUp color="#6B7A4A" size={28}/>} />
        <StatCard title="Total Items Tracked" value={inventory.length} icon={<Package color="#6B7A4A" size={28}/>} />
        <StatCard title="Low Stock Alerts" value={lowStock} icon={<AlertTriangle color="#ef4444" size={28}/>} alert={lowStock > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders Snippet */}
        <div className="bg-surface rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Recent Deliveries</h3>
          </div>
          <div className="space-y-4">
            {orders.slice(-5).reverse().map((o) => (
              <div key={o._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">#{o._id.slice(-6).toUpperCase()}</p>
                  <p className="text-sm text-gray-500">{o.customer?.name || 'Walk-in'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">${o.totalAmount.toFixed(2)}</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getStatusColor(o.deliveryStatus)}`}>
                    {o.deliveryStatus}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500 text-sm py-4">No active orders.</p>}
          </div>
        </div>

        {/* Inventory Snippet */}
        <div className="bg-surface rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Inventory Alerts</h3>
          </div>
          <div className="space-y-4">
            {inventory.filter(i => i.quantity <= i.reorderLevel).map(i => (
              <div key={i._id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-red-500" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">{i.product?.name || 'Unknown'}</p>
                    <p className="text-sm text-red-600">Reorder Level: {i.reorderLevel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600 text-lg">{i.quantity}</p>
                  <p className="text-xs text-red-500 mt-1 uppercase tracking-wide">Stock</p>
                </div>
              </div>
            ))}
            {lowStock === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-green-600">
                <CheckCircle size={32} className="mb-2" />
                <p className="text-sm font-medium">All stock levels are optimal.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, alert }) {
  return (
    <div className={`bg-surface p-6 rounded-xl shadow-sm border ${alert ? 'border-red-300' : 'border-gray-100'} flex items-center justify-between`}>
      <div>
        <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
        <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
      </div>
      <div className={`p-3 rounded-lg ${alert ? 'bg-red-50' : 'bg-gray-50'}`}>
        {icon}
      </div>
    </div>
  )
}

function getStatusColor(status) {
  switch (status) {
    case 'pending': return 'bg-gray-200 text-gray-800';
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'in-transit': return 'bg-yellow-100 text-yellow-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}