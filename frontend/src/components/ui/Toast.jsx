import React, { useEffect } from 'react';
import { X, Check, AlertCircle, ShoppingCart } from 'lucide-react';

export default function Toast({ id, type = 'success', message, title, onClose, duration = 5000, details }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    order: 'bg-purple-500'
  }[type];

  const icon = {
    success: <Check className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <ShoppingCart className="w-5 h-5" />,
    order: <ShoppingCart className="w-5 h-5" />
  }[type];

  return (
    <div
      className={`${bgColor} text-white rounded-lg shadow-lg p-4 mb-3 animate-slide-in max-w-md`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1">
          {title && <h3 className="font-bold text-sm">{title}</h3>}
          <p className="text-sm">{message}</p>
          {details && (
            <div className="text-xs mt-2 opacity-90 border-t border-white border-opacity-30 pt-2">
              {details}
            </div>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 text-white hover:opacity-75"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

