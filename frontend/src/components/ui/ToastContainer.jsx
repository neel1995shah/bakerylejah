import React from 'react';
import Toast from './Toast.jsx';

export default function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-auto">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          title={toast.title}
          details={toast.details}
          duration={toast.duration}
          onClose={onRemove}
        />
      ))}
    </div>
  );
}
