import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onHide?: () => void;
  id?: string;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onHide 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Show toast
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide toast after duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onHide?.();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, duration, onHide]);

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#4CAF50', icon: 'checkmark-circle' };
      case 'error':
        return { backgroundColor: '#F44336', icon: 'close-circle' };
      case 'warning':
        return { backgroundColor: '#FF9800', icon: 'warning' };
      default:
        return { backgroundColor: '#2196F3', icon: 'information-circle' };
    }
  };

  const { backgroundColor, icon } = getToastStyle();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Ionicons name={icon as any} size={20} color="white" style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  icon: {
    marginRight: 10,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
});

// Toast manager for global usage
class ToastManager {
  private static instance: ToastManager;
  private listeners: Array<(toast: ToastProps) => void> = [];

  static getInstance(): ToastManager {
    if (!ToastManager.instance) {
      ToastManager.instance = new ToastManager();
    }
    return ToastManager.instance;
  }

  show(toast: ToastProps) {
    this.listeners.forEach(listener => listener(toast));
  }

  subscribe(listener: (toast: ToastProps) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const toastManager = ToastManager.getInstance();

// Hook for using toast
export const useToast = () => {
  return {
    show: (message: string, type?: ToastProps['type'], duration?: number) => {
      toastManager.show({ message, type, duration });
    },
    success: (message: string, duration?: number) => {
      toastManager.show({ message, type: 'success', duration });
    },
    error: (message: string, duration?: number) => {
      toastManager.show({ message, type: 'error', duration });
    },
    warning: (message: string, duration?: number) => {
      toastManager.show({ message, type: 'warning', duration });
    },
    info: (message: string, duration?: number) => {
      toastManager.show({ message, type: 'info', duration });
    },
  };
}; 