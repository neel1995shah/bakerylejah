import React from 'react';

export default function Card({ title, subtitle, icon, children, className = '' }) {
  return (
    <div className={`bg-surface rounded-xl shadow-sm border border-gray-100 flex flex-col ${className}`}>
      {(title || icon) && (
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div>
            {title && <h3 className="text-lg font-bold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {icon && (
            <div className="text-primary bg-primary/10 p-2 rounded-lg">
              {icon}
            </div>
          )}
        </div>
      )}
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}