import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout.jsx';
import Login from './pages/Login.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import WorkerDashboard from './pages/WorkerDashboard.jsx';
import Orders from './pages/Orders.jsx';
import Inventory from './pages/Inventory.jsx';
import Customers from './pages/Customers.jsx';

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === 'manager' ? '/manager' : '/worker'} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/manager" element={
            <ProtectedRoute allowedRole="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/orders" element={
            <ProtectedRoute allowedRole="manager">
              <Orders />
            </ProtectedRoute>
          } />
          
          <Route path="/inventory" element={
            <ProtectedRoute allowedRole="manager">
              <Inventory />
            </ProtectedRoute>
          } />

          <Route path="/customers" element={
            <ProtectedRoute allowedRole="manager">
              <Customers />
            </ProtectedRoute>
          } />

          <Route path="/worker" element={
            <ProtectedRoute allowedRole="worker">
              <WorkerDashboard />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}