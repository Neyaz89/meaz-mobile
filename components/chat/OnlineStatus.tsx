import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface OnlineStatusProps {
  isOnline: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
  size?: number;
  showPulse?: boolean;
}

export const OnlineStatus: React.FC<OnlineStatusProps> = ({
  isOnline,
  status = 'offline',
  size = 12,
  showPulse = true,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOnline && showPulse) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      const scaleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      scaleAnimation.start();

      return () => {
        pulseAnimation.stop();
        scaleAnimation.stop();
      };
    } else {
      pulseAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [isOnline, showPulse]);

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'away':
        return '#FF9800';
      case 'busy':
        return '#F44336';
      case 'offline':
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'offline':
      default:
        return 'Offline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.indicator,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: getStatusColor(),
              borderWidth: 2,
              borderColor: '#fff',
            },
          ]}
        />
        {isOnline && showPulse && (
          <Animated.View
            style={[
              styles.pulse,
              {
                width: size * 2,
                height: size * 2,
                borderRadius: size,
                borderColor: getStatusColor(),
                opacity: pulseAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    zIndex: 2,
  },
  pulse: {
    position: 'absolute',
    borderWidth: 1,
    zIndex: 1,
  },
}); 