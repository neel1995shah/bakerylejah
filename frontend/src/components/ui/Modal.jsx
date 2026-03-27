import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-primary/20 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative glass-card w-full flex flex-col ${maxWidth} max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300 rounded-[2.5rem]`}>
        <div className="flex justify-between items-center p-8 border-b border-black/5 bg-white/40 shrink-0">
          <h3 className="text-2xl font-black text-primary tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/50 rounded-2xl transition-all text-primary/40 hover:text-primary active:scale-95"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}