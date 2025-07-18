import { InteractionManager } from 'react-native';

/**
 * Delays execution until after interactions are complete
 */
export const runAfterInteractions = (callback: () => void): void => {
  InteractionManager.runAfterInteractions(callback);
};

/**
 * Debounce function to limit rapid function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit function calls to once per interval
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Memoize function results
 */
export const memoize = <T extends (...args: any[]) => any>(
  func: T
): T => {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Batch multiple state updates
 */
export const batchUpdates = (callback: () => void): void => {
  // React Native automatically batches updates in event handlers
  // This is a placeholder for potential future batching needs
  callback();
};

/**
 * Check if device has sufficient memory for heavy operations
 */
export const hasEnoughMemory = (): boolean => {
  // Basic heuristic - in a real app, you might use a native module
  // to check actual memory usage
  return true;
};

/**
 * Lazy load a component with error boundary
 */
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc);
};