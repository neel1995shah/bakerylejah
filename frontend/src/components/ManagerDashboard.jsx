import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function ManagerDashboard() {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('token');
      // In a real app we would combine these to a single API or use Promise.all
      // Fetching Orders
      const orderRes = await fetch('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordersData = await orderRes.json();
      setOrders(ordersData);

      // Fetching Inventory
      const invRes = await fetch('http://localhost:5000/api/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const invData = await invRes.json();
      setInventory(invData);
    };

    fetchDashboardData();

    // Socket Initialization
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      socket.emit('join_room', 'manager');
    });

    socket.on('orderCreated', (order) => {
      setOrders(prev => [...prev, order]);
    });

    socket.on('workerAssigned', (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
    });

    socket.on('deliveryStarted', (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
    });

    socket.on('deliveryCompleted', (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
    });

    socket.on('stockUpdated', (inv) => {
      setInventory(prev => prev.map(i => i._id === inv._id ? inv : i));
    });

    return () => socket.disconnect();
  }, []);

  return (
    <div className="dashboard">
      <header><h1>Manager Dashboard</h1></header>
      
      <section>
        <h2>Real-Time Inventory</h2>
        <ul>
          {inventory.length > 0 ? inventory.map((item, i) => (
            <li key={i}>
              {item.product?.name || 'Unknown Product'}: {item.quantity} Qty
            </li>
          )) : <li>No inventory data</li>}
        </ul>
      </section>

      <section>
        <h2>Live Orders & Deliveries</h2>
        <ul>
          {orders.length > 0 ? orders.map((o, i) => (
            <li key={i}>
              <strong>Order #{o._id.slice(-4)}</strong> - 
              Customer Dues: ${o.totalAmount} - 
              Status: <span style={{color: 'var(--secondary)'}}>{o.deliveryStatus}</span> - 
              Worker: {o.assignedWorker?.username || 'Unassigned'}
            </li>
          )) : <li>No pending orders</li>}
        </ul>
      </section>
    </div>
  );
}