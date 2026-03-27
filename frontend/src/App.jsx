import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout/Layout.jsx';
import Login from './pages/Login.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import WorkerDashboard from './pages/WorkerDashboard.jsx';
import Orders from './pages/Orders.jsx';
import Inventory from './pages/Inventory.jsx';
import Customers from './pages/Customers.jsx';
import Notifications from './pages/Notifications.jsx';
import StockRegistration from './pages/StockRegistration.jsx';
import CustomerNeed from './pages/CustomerNeed.jsx';

const adminRoles = ['owner', 'sub_manager', 'manager'];

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (allowedRole) {
    const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
    if (!allowed.includes(role)) {
      return <Navigate to={adminRoles.includes(role) ? '/manager' : '/worker'} replace />;
    }
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
            <ProtectedRoute allowedRole={adminRoles}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/orders" element={
            <ProtectedRoute allowedRole={adminRoles}>
              <Orders />
            </ProtectedRoute>
          } />
          
          <Route path="/inventory" element={
            <ProtectedRoute allowedRole={adminRoles}>
              <Inventory />
            </ProtectedRoute>
          } />

          <Route path="/customers" element={
            <ProtectedRoute allowedRole={adminRoles}>
              <Customers />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />

          <Route path="/stock-registration" element={
            <ProtectedRoute>
              <StockRegistration />
            </ProtectedRoute>
          } />

          <Route path="/customer-need" element={
            <ProtectedRoute>
              <CustomerNeed />
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
