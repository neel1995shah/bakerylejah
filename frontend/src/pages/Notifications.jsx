import React, { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, ShoppingCart, Package, Boxes, CheckCheck, Trash2 } from 'lucide-react';

export default function Notifications() {
  const {
    notifications = [],
    unreadCount = 0,
    markAllAsRead = () => {},
    clearNotifications = () => {}
  } = useOutletContext() || {};

  useEffect(() => {
    markAllAsRead();
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-primary tracking-tight">Notifications</h1>
          <p className="text-primary/60 font-medium">All updates for new orders and inventory changes appear here.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllAsRead}
            className="min-h-[44px] px-4 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase tracking-wider hover:bg-primary/15 transition-colors flex items-center gap-2"
          >
            <CheckCheck size={14} /> Mark All Read
          </button>
          <button
            type="button"
            onClick={clearNotifications}
            className="min-h-[44px] px-4 rounded-xl bg-red-100 text-red-600 text-xs font-black uppercase tracking-wider hover:bg-red-200 transition-colors flex items-center gap-2"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="glass-card !p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary/50">Activity Feed</span>
          <span className="text-xs font-bold text-primary/60">Unread: {unreadCount}</span>
        </div>

        <div className="divide-y divide-black/5">
          {notifications.length === 0 && (
            <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                <Bell size={22} className="text-primary/50" />
              </div>
              <p className="font-black text-primary tracking-tight">No notifications yet</p>
              <p className="text-primary/50 text-sm">New order and inventory updates will show here automatically.</p>
            </div>
          )}

          {notifications.map((n) => {
            const icon = getIcon(n.type);
            return (
              <div key={n.id} className={`px-5 py-4 flex items-start gap-3 ${!n.read ? 'bg-yellow-50/40' : 'bg-transparent'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${icon.bg}`}>
                  {icon.node}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-black text-primary tracking-tight">{n.title}</p>
                    <span className="text-[10px] font-bold text-primary/50 whitespace-nowrap">
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-primary/70 mt-0.5">{n.message}</p>
                  {n.meta && (
                    <p className="text-[11px] font-bold text-primary/50 mt-1 uppercase tracking-wide">{n.meta}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getIcon(type) {
  switch (type) {
    case 'order':
      return {
        node: <ShoppingCart size={16} className="text-blue-700" />,
        bg: 'bg-blue-100'
      };
    case 'inventory':
      return {
        node: <Package size={16} className="text-green-700" />,
        bg: 'bg-green-100'
      };
    case 'stock':
      return {
        node: <Boxes size={16} className="text-orange-700" />,
        bg: 'bg-orange-100'
      };
    default:
      return {
        node: <Bell size={16} className="text-primary/70" />,
        bg: 'bg-primary/10'
      };
  }
}

function formatTime(ts) {
  if (!ts) return 'just now';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return 'just now';
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

