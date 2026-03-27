import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../config/runtime.js';
import { Store, LayoutDashboard, ShoppingCart, Package, Users, LogOut, Truck, ChevronRight, Bell, ClipboardList, NotebookPen } from 'lucide-react';
import brandLogo from '../assets/logo.svg';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = localStorage.getItem('notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || 'worker';
  const isAdmin = ['owner', 'sub_manager', 'manager'].includes(role);
  const username = localStorage.getItem('username') || 'User';
  const unreadCount = notifications.filter((n) => !n.read).length;

  const pushNotification = (next) => {
    setNotifications((prev) => [{
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...next
    }, ...prev].slice(0, 100));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const navItems = isAdmin 
     ? [
         { path: '/manager', label: 'Dashboard', icon: <LayoutDashboard size={24} /> },
         { path: '/orders', label: 'Orders', icon: <ShoppingCart size={24} /> },
         { path: '/inventory', label: 'Inventory', icon: <Package size={24} /> },
         { path: '/stock-registration', label: 'Stock Registration', icon: <ClipboardList size={24} /> },
         { path: '/customer-need', label: 'Customer Need', icon: <NotebookPen size={24} /> },
         { path: '/customers', label: 'Customers', icon: <Users size={24} /> },
         { path: '/notifications', label: 'Notifications', icon: <Bell size={24} /> },
       ]
     : [
         { path: '/worker', label: 'Deliveries', icon: <Truck size={24} /> },
         { path: '/stock-registration', label: 'Stock Registration', icon: <ClipboardList size={24} /> },
         { path: '/customer-need', label: 'Customer Need', icon: <NotebookPen size={24} /> },
         { path: '/notifications', label: 'Notifications', icon: <Bell size={24} /> },
       ];

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const socket = io(SOCKET_ORIGIN);

    socket.on('connect', () => {
      if (role) socket.emit('join_room', role);
      if (isAdmin) socket.emit('join_room', 'manager');
    });

    socket.on('orderCreated', (order) => {
      pushNotification({
        type: 'order',
        title: 'New order created',
        message: `${order?.customer?.name || 'Walk-in'} placed an order.`,
        meta: order?._id ? `#${order._id.slice(-6).toUpperCase()}` : ''
      });
    });

    socket.on('inventoryItemCreated', (item) => {
      pushNotification({
        type: 'inventory',
        title: 'New inventory item',
        message: `${item?.productName || 'Item'} was added to inventory.`,
        meta: item?.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : ''
      });
    });

    socket.on('stockUpdated', (item) => {
      pushNotification({
        type: 'stock',
        title: 'Inventory updated',
        message: `${item?.product?.name || 'Item'} stock changed.`,
        meta: item?.quantity != null ? `Qty: ${item.quantity}` : ''
      });
    });

    socket.on('stockAlertCreated', (alert) => {
      pushNotification({
        type: 'stock-alert',
        title: 'New stock alert registered',
        message: `${alert?.itemName || 'Item'} requires stock attention.`,
        meta: (alert?.priority || 'medium').toUpperCase()
      });
    });

    socket.on('stockAlertCompleted', (alert) => {
      pushNotification({
        type: 'stock-alert',
        title: 'Stock alert completed',
        message: `${alert?.itemName || 'Item'} alert marked completed.`,
        meta: alert?.completedBy?.username ? `By ${alert.completedBy.username}` : ''
      });
    });

    socket.on('customerNeedCreated', (need) => {
      pushNotification({
        type: 'customer-need',
        title: 'New customer need registered',
        message: `${need?.customerName || 'Customer'} requested: ${need?.requirement || 'Need'}`,
        meta: need?.customerPhone || ''
      });
    });

    socket.on('customerNeedDone', (need) => {
      pushNotification({
        type: 'customer-need',
        title: 'Customer need completed',
        message: `${need?.customerName || 'Customer'} need marked done.`,
        meta: need?.doneBy?.username ? `By ${need.doneBy.username}` : ''
      });
    });

    return () => socket.disconnect();
  }, [role, isAdmin]);

  return (
    <div className="flex h-screen bg-[#F9F6F0] overflow-hidden font-sans">
      {/* Sidebar - Desktop */}
      <aside className={`
        hidden lg:flex flex-col z-50 transition-all duration-500 ease-in-out transform relative
        ${isCollapsed ? 'w-24' : 'w-72'}
        bg-primary text-secondary shadow-2xl
      `}>
        {/* Logo Area */}
        <div className="p-8 flex items-center gap-4 border-b border-white/5 relative">
          <div className="rounded-full p-0.5 shadow-lg flex-shrink-0 overflow-hidden ring-2 ring-white/30">
            <img src={brandLogo} alt="Lejaah logo" className="h-10 w-10 rounded-full object-cover" />
          </div>
          {!isCollapsed && (
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic whitespace-nowrap">
              Lejaah
            </h1>
          )}
          {/* Collapse Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-secondary text-primary rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 border-4 border-primary"
          >
            <ChevronRight className={`transition-transform duration-500 ${isCollapsed ? '' : 'rotate-180'}`} size={16} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
                  ${isActive 
                    ? 'bg-secondary text-primary shadow-xl scale-[1.02] font-bold' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <span className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                  {item.icon}
                </span>
                {!isCollapsed && <span className="text-lg whitespace-nowrap">{item.label}</span>}
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="ml-auto min-w-[22px] h-[22px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-6 border-t border-white/5 bg-black/10">
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className={`flex items-center gap-4 w-full px-5 py-4 text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            <LogOut size={22} className="rotate-180 flex-shrink-0" />
            {!isCollapsed && <span className="font-semibold uppercase tracking-widest text-xs whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Universal Header */}
        <header className="h-20 bg-white/40 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 lg:px-10 z-30">
          <div className="flex items-center gap-6">
            <img src={brandLogo} alt="Lejaah logo" className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-black/5" />
            <h2 className="text-2xl font-bold text-primary tracking-tight capitalize">
              {location.pathname.replace('/', '') || 'Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-sm font-bold text-primary">{username}</span>
              <span className="text-[10px] uppercase tracking-tighter text-primary/40 leading-none">{role} account</span>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)} 
                className="w-12 h-12 rounded-2xl bg-primary flex flex-shrink-0 items-center justify-center text-secondary font-black shadow-lg shadow-primary/20 border-2 border-white/50 hover:opacity-90 transition-opacity active:scale-95"
              >
                {username.charAt(0).toUpperCase()}
              </button>
              
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute top-14 right-0 w-48 bg-white/90 backdrop-blur-lg rounded-2xl shadow-antigravity border border-black/5 p-2 z-50">
                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsLogoutModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-10 pb-32 lg:pb-10 relative">
          <div className="max-w-[1600px] mx-auto">
            <Outlet context={{ notifications, unreadCount, markAllAsRead, clearNotifications }} />
          </div>
        </div>

        {/* Persistent Bottom Nav - Mobile Only (Floating Pill) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-[72px] bg-primary/95 backdrop-blur-xl shadow-2xl flex items-center justify-around px-2 border border-white/10 rounded-[2rem] lg:hidden z-40">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
             return (
               <Link
                 key={item.path}
                 to={item.path}
                 className={`relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] p-2 transition-all duration-300
                   ${isActive ? 'text-secondary scale-110' : 'text-white/40 hover:text-white/60'}
                 `}
               >
                 {item.icon}
                 {item.path === '/notifications' && unreadCount > 0 && (
                   <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[8px] font-black flex items-center justify-center">
                     {unreadCount > 9 ? '9+' : unreadCount}
                   </span>
                 )}
                 {/* Active Indicator Dot */}
                 <span className={`absolute -bottom-1 w-1 h-1 rounded-full transition-all duration-300 ${isActive ? 'bg-secondary scale-100' : 'bg-transparent scale-0'}`} />
               </Link>
             );
          })}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-antigravity animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto">
              <LogOut size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-primary text-center tracking-tight mb-2">Sign Out</h3>
            <p className="text-primary/60 text-center font-medium mb-8">
              Are you sure you want to securely end your session? You will need to sign in again to access the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 bg-primary/5 text-primary py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-primary/10 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

