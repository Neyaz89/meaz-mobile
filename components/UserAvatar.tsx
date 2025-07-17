import React from 'react';
import { Image, ImageStyle, StyleSheet, View } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';

interface UserAvatarProps {
  user?: {
    id: string;
    avatar?: string;
    displayName?: string;
    username?: string;
  } | null;
  size?: number;
  style?: ImageStyle;
  showBorder?: boolean;
  borderColor?: string;
}

export default function UserAvatar({ 
  user, 
  size = 40, 
  style, 
  showBorder = false,
  borderColor 
}: UserAvatarProps) {
  const defaultColor = useThemeColor({}, 'text');
  const borderColorValue = borderColor || defaultColor;
  
  // Default bear avatar image
  const defaultAvatar = require('../assets/images/default-avatar.png');
  
  // Check if user has a valid avatar URL
  const hasValidAvatar = user?.avatar && 
    user.avatar.trim() !== '' && 
    user.avatar !== 'null' && 
    user.avatar !== 'undefined';

  const avatarStyles = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    showBorder && {
      borderWidth: 2,
      borderColor: borderColorValue,
    },
    style,
  ];

  if (!hasValidAvatar) {
    // Show default bear avatar
    return (
      <View style={[styles.container, avatarStyles]}>
        <Image
          source={defaultAvatar}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Show user's uploaded avatar
  return (
    <View style={[styles.container, avatarStyles]}>
      <Image
        source={{ uri: user.avatar }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        resizeMode="cover"
        defaultSource={defaultAvatar} // Fallback while loading
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
}); 