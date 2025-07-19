import React, { useEffect, useRef } from 'react';
import { Animated, Modal, ModalProps, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';

interface AnimatedModalProps extends ModalProps {
  isVisible: boolean;
  onBackdropPress?: () => void;
  animationType?: 'fade' | 'slide' | 'scale';
  children: React.ReactNode;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = ({
  isVisible,
  onBackdropPress,
  animationType = 'fade',
  children,
  ...modalProps
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (isVisible) {
      const animations = [];
      
      if (animationType === 'fade' || animationType === 'scale') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        );
      }
      
      if (animationType === 'scale') {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          })
        );
      }
      
      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start();
    } else {
      const animations = [];
      
      if (animationType === 'fade' || animationType === 'scale') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          })
        );
      }
      
      if (animationType === 'scale') {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          })
        );
      }
      
      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: 300,
            duration: 200,
            useNativeDriver: true,
          })
        );
      }

      Animated.parallel(animations).start();
    }
  }, [isVisible, animationType, fadeAnim, scaleAnim, slideAnim]);

  const getAnimatedStyle = () => {
    switch (animationType) {
      case 'scale':
        return {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        };
      case 'slide':
        return {
          transform: [{ translateY: slideAnim }],
        };
      case 'fade':
      default:
        return {
          opacity: fadeAnim,
        };
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      {...modalProps}
    >
      <TouchableWithoutFeedback onPress={onBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.content, getAnimatedStyle()]}>
              {children}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxWidth: '90%',
    maxHeight: '80%',
  },
});