import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

interface ConfettiPiece {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
}

interface ConfettiEffectProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
  pieceCount?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const COLORS = [
  '#FF6B35', // Indian Saffron
  '#138808', // Indian Green
  '#000080', // Indian Navy Blue
  '#FFD700', // Gold
  '#FF69B4', // Hot Pink
  '#00CED1', // Dark Turquoise
];

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  isVisible,
  onComplete,
  duration = 3000,
  pieceCount = 30,
}) => {
  const pieces = useRef<ConfettiPiece[]>([]);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isVisible) {
      startConfetti();
    } else {
      stopConfetti();
    }

    return () => {
      stopConfetti();
    };
  }, [isVisible]);

  const startConfetti = () => {
    // Create confetti pieces
    pieces.current = Array.from({ length: pieceCount }, (_, index) => ({
      id: index,
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(-20),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
    }));

    // Animate each piece
    const animations = pieces.current.map((piece) => {
      const fallDistance = screenHeight + 100;
      const fallDuration = duration + Math.random() * 1000;
      const horizontalDrift = (Math.random() - 0.5) * 200;

      return Animated.parallel([
        Animated.timing(piece.y, {
          toValue: fallDistance,
          duration: fallDuration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.x, {
          toValue: Math.random() * screenWidth + horizontalDrift,
          duration: fallDuration,
          useNativeDriver: true,
        }),
        Animated.timing(piece.rotation, {
          toValue: Math.random() * 360,
          duration: fallDuration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(piece.scale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(piece.scale, {
            toValue: 0,
            duration: 300,
            delay: fallDuration - 500,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    animationRef.current = Animated.parallel(animations);
    animationRef.current.start(() => {
      onComplete?.();
    });
  };

  const stopConfetti = () => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
  };

  if (!isVisible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.current.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: piece.color,
              width: piece.size,
              height: piece.size,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                { rotate: piece.rotation.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                })},
                { scale: piece.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
});