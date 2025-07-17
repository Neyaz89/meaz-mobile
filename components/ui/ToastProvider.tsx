import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Toast, toastManager, ToastProps } from './Toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe((toast) => {
      const id = Date.now().toString();
      const toastWithId = { ...toast, id };
      
      setToasts(prev => [...prev, toastWithId]);
      
      // Auto-remove toast after it's hidden
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, (toast.duration || 3000) + 600); // Add buffer for animation
    });

    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onHide={() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id));
          }}
        />
      ))}
    </View>
  );
}; 