import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Hook to ensure the framework is ready before rendering the app
 * This is critical for Expo Router to function properly
 */
export function useFrameworkReady() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure the framework is ready
    const timer = setTimeout(() => {
      setIsReady(true);
    }, Platform.OS === 'web' ? 0 : 100);

    return () => clearTimeout(timer);
  }, []);

  return isReady;
}