import React, { memo, useState } from 'react';
import { ActivityIndicator, Image, ImageProps, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  uri: string;
  placeholder?: string;
  showLoader?: boolean;
  fallbackText?: string;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  uri,
  placeholder,
  showLoader = true,
  fallbackText = 'Image',
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <View style={[styles.fallback, style]}>
        <ThemedText style={styles.fallbackText}>{fallbackText}</ThemedText>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ uri }}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        style={[StyleSheet.absoluteFill]}
        {...props}
      />
      {loading && showLoader && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      )}
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  fallbackText: {
    fontSize: 12,
    color: '#666',
  },
});