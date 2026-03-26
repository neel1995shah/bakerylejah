import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Store, LayoutDashboard, ShoppingCart, Package, Users, LogOut, Truck } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || 'worker';
  const username = localStorage.getItem('username') || 'User';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const navItems = role === 'manager' 
    ? [
        { path: '/manager', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/orders', label: 'Orders', icon: <ShoppingCart size={20} /> },
        { path: '/inventory', label: 'Inventory', icon: <Package size={20} /> },
        { path: '/customers', label: 'Customers', icon: <Users size={20} /> },
      ]
    : [
        { path: '/worker', label: 'Deliveries', icon: <Truck size={20} /> },
      ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-accent flex flex-col shadow-lg">
        <div className="p-6 flex items-center gap-3 border-b border-white/20">
          <div className="bg-secondary p-2 rounded-lg">
            <Store className="text-white" size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-wider">FreshMarket</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-secondary text-white shadow-md font-medium' 
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/20">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-surface shadow-sm border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold text-gray-800 capitalize">
            {location.pathname.replace('/', '') || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}