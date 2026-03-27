import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function WorkerDashboard() {
  const [orders, setOrders] = useState([]);
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchOrders = async () => {
      // For simplicity, fetching all orders locally and filtering to test.
      // Optimally, backend would return just this worker's orders and pending ones.
      const res = await fetch('http://localhost:5000/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Keep unassigned or assigned specifically to this worker
      setOrders(data.filter(o => o.deliveryStatus === 'pending' || (o.assignedWorker && o.assignedWorker._id === userId)));
    };

    fetchOrders();

    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      socket.emit('join_room', 'worker');
    });

    socket.on('orderCreated', (order) => {
      // Automatically show the new orders broadcast by manager
      setOrders(prev => [...prev, order]);
    });

    socket.on('workerAssigned', (order) => {
      setOrders(prev => {
        // If someone else took it, we could remove it, but for now just update it
        // If it's not assigned to me, remove it from list
        if (order.assignedWorker._id !== userId) {
          return prev.filter(o => o._id !== order._id);
        }
        // If assigned to me, update
        const exists = prev.find(o => o._id === order._id);
        if (exists) return prev.map(o => o._id === order._id ? order : o);
        return [...prev, order];
      });
    });

    socket.on('deliveryStarted', (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
    });

    socket.on('deliveryCompleted', (order) => {
      setOrders(prev => prev.map(o => o._id === order._id ? order : o));
    });

    return () => socket.disconnect();
  }, [token, userId]);

  const takeOrder = async (orderId) => {
    await fetch(`http://localhost:5000/api/orders/${orderId}/assign`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ workerId: userId })
    });
  };

  const updateDeliveryStatus = async (orderId, status) => {
    await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
  };

  return (
    <div className="dashboard">
      <header><h1>Worker Delivery Dashboard</h1></header>
      
      <section>
        <h2>Available or Assigned Deliveries</h2>
        <ul>
          {orders.length > 0 ? orders.map((o, i) => (
            <li key={i} style={{ borderBottom: '1px solid #ccc', padding: '10px 0'}}>
              <strong>Order #{o._id.slice(-4)}</strong> - Status: {o.deliveryStatus}
              <br />
              
              {o.deliveryStatus === 'pending' && (
                <button onClick={() => takeOrder(o._id)}>Assign to me</button>
              )}

              {o.deliveryStatus === 'assigned' && o.assignedWorker?._id === userId && (
                <button onClick={() => updateDeliveryStatus(o._id, 'in-transit')}>Start Delivery</button>
              )}

              {o.deliveryStatus === 'in-transit' && o.assignedWorker?._id === userId && (
                <button onClick={() => updateDeliveryStatus(o._id, 'delivered')}>Mark as Delivered</button>
              )}
            </li>
          )) : <li>No deliveries currently</li>}
        </ul>
      </section>
    </div>
  );
}