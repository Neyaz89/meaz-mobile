import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-video';
import React, { useState } from 'react';
import { Image, Linking, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { Message } from '../../types/chat';
import { useTheme } from '../ThemeContext';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

interface ChatBubbleProps {
  message: Message;
  isSent: boolean;
  showAvatar?: boolean;
  avatarUri?: string;
  children?: React.ReactNode;
  customization?: {
    theme?: string;
    bubbleStyle?: string;
    fontFamily?: string;
    fontSize?: string;
  };
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isSent, showAvatar, avatarUri, children, customization }) => {
  // Use chat customization if provided, else fallback to theme context
  const { theme: globalTheme, fontSize: globalFontSize, colorBlindMode } = useTheme();
  const theme = customization?.theme || (colorBlindMode !== 'none' ? colorBlindMode : globalTheme);
  const fontSize = customization?.fontSize || globalFontSize;
  const fontFamily = customization?.fontFamily || 'System';
  const bubbleStyle = customization?.bubbleStyle || 'rounded';
  const themeColors = {
    card: theme === 'dark' ? '#232526' : theme === 'gradient' ? '#ff9966' : theme === 'pastel' ? '#a8edea' : '#fff',
    border: theme === 'dark' ? '#414345' : theme === 'gradient' ? '#ff5e62' : theme === 'pastel' ? '#fed6e3' : '#eee',
    accent: '#25d366',
    glow: undefined,
    gradient: theme === 'gradient' ? ['#ff9966', '#ff5e62'] : undefined,
    blur: undefined,
    animation: undefined,
    text: theme === 'dark' ? '#fff' : '#222',
    background: theme === 'dark' ? '#232526' : '#fff',
    tint: '#25d366',
    icon: '#25d366',
    tabIconDefault: '#888',
    tabIconSelected: '#25d366',
  };
  const [mediaModal, setMediaModal] = useState<{ visible: boolean; type: 'image' | 'video' | null; uri?: string }>({ visible: false, type: null });
  const bubbleScale = useSharedValue(1);
  const bubbleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bubbleScale.value }],
  }));
  const hapticOptions = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };
  const fontSizeMap = { small: 14, medium: 17, large: 22 };

  // Bubble alignment and color
  const alignStyle = isSent ? styles.sent : styles.received;

  // Render reactions (array of {emoji, users})
  const renderReactions = () => (
    message.reactions && message.reactions.length > 0 ? (
      <View style={styles.reactionsRow}>
        {message.reactions.map((reaction, idx) => (
          <ThemedText key={idx} style={styles.reactionGlow}>{reaction.emoji} {reaction.users.length > 1 ? reaction.users.length : ''}</ThemedText>
        ))}
      </View>
    ) : null
  );

  // Render read receipt icon
  const renderStatusIcon = () => {
    if (!isSent) return null;
    let icon = null;
    let color = theme === 'neon' ? '#39FF14' : theme === 'cyberpunk' ? '#00FFF7' : '#06b6d4';
    let glow = color;
    switch (message.status) {
      case 'sending':
        icon = <Ionicons name="time-outline" size={18} color={color} style={{ textShadowColor: glow, textShadowRadius: 8 }} />;
        break;
      case 'sent':
        icon = <Ionicons name="checkmark-outline" size={18} color={color} style={{ textShadowColor: glow, textShadowRadius: 8 }} />;
        break;
      case 'delivered':
        icon = <Ionicons name="checkmark-done-outline" size={18} color={color} style={{ textShadowColor: glow, textShadowRadius: 8 }} />;
        break;
      case 'read':
        icon = <Ionicons name="eye-outline" size={18} color={color} style={{ textShadowColor: glow, textShadowRadius: 8 }} />;
        break;
      default:
        break;
    }
    return <View style={styles.statusIcon}>{icon}</View>;
  };

  // Render file attachment
  const renderFile = () => (
    <TouchableOpacity
      style={styles.fileContainer}
      onPress={() => Linking.openURL(message.content)}
      activeOpacity={0.8}
    >
      <Ionicons name="document-outline" size={28} color="#00FFF7" style={styles.fileIcon} />
      <ThemedText style={styles.fileName}>File Attachment</ThemedText>
    </TouchableOpacity>
  );

  // Render video thumbnail
  const renderVideo = () => (
    <TouchableOpacity
      style={styles.videoThumbContainer}
      onPress={() => setMediaModal({ visible: true, type: 'video', uri: message.content })}
      activeOpacity={0.85}
    >
      <Video
        source={{ uri: message.content }}
        style={styles.videoThumb}
        resizeMode={ResizeMode.COVER}
        isMuted
        shouldPlay={false}
      />
      <View style={styles.playOverlay}>
        <Ionicons name="play-circle" size={48} color="#FF00EA" style={styles.playIcon} />
      </View>
    </TouchableOpacity>
  );

  // Render image with tap-to-view
  const renderImage = () => (
    <TouchableOpacity
      onPress={() => setMediaModal({ visible: true, type: 'image', uri: message.content })}
      activeOpacity={0.85}
    >
      <Image source={typeof message.content === 'string' ? { uri: message.content } : undefined} style={styles.image} />
    </TouchableOpacity>
  );

  // Bubble background logic
  let bubbleContent = (
    <ThemedView
      style={[
        styles.bubble,
        isSent ? styles.bubbleSent : styles.bubbleReceived,
        { backgroundColor: themeColors.card, borderColor: themeColors.border, shadowColor: themeColors.accent },
        bubbleStyle === 'rounded' ? { borderRadius: 24 } : bubbleStyle === 'glass' ? { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 18 } : {},
      ]}
    >
      {message.type === 'image' && message.content && renderImage()}
      {message.type === 'video' && message.content && renderVideo()}
      {message.type === 'file' && renderFile()}
      {message.type === 'text' && <ThemedText style={{ color: themeColors.text, fontFamily, fontSize: fontSizeMap[fontSize] }}>{message.content}</ThemedText>}
      {message.type === 'voice' && <ThemedText style={{ color: themeColors.text, fontFamily }}>🎤 Voice message</ThemedText>}
      {children}
      {renderReactions()}
      {renderStatusIcon()}
    </ThemedView>
  );

  // Apply gradient or blur if theme supports it
  if (themeColors.gradient) {
    bubbleContent = (
      <LinearGradient colors={themeColors.gradient} style={styles.bubble}>
        {bubbleContent}
      </LinearGradient>
    );
  } else if (themeColors.blur) {
    bubbleContent = (
      <BlurView intensity={themeColors.blur} style={styles.bubble}>
        {bubbleContent}
      </BlurView>
    );
  }

  // Animation (optional, for cyberpunk/neon)
  let AnimatedBubble = bubbleContent;
  if (themeColors.animation?.type === 'pulse') {
    AnimatedBubble = (
      <Animated.View entering={FadeInUp.springify()} style={{ shadowColor: themeColors.accent, shadowRadius: 16, shadowOpacity: 0.8 }}>{bubbleContent}</Animated.View>
    );
  } else if (themeColors.animation?.type === 'neon-flicker') {
    AnimatedBubble = (
      <Animated.View entering={FadeInUp.springify()} style={{ shadowColor: themeColors.text, shadowRadius: 20, shadowOpacity: 1 }}>{bubbleContent}</Animated.View>
    );
  } else if (themeColors.animation?.type === 'fade') {
    AnimatedBubble = (
      <Animated.View entering={FadeInUp.duration(themeColors.animation.duration || 800)}>{bubbleContent}</Animated.View>
    );
  }

  const handleBubblePress = () => {
    bubbleScale.value = withSequence(withSpring(0.96), withSpring(1));
  };
  const handleBubbleLongPress = () => {
    bubbleScale.value = withSequence(withSpring(0.92), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium, hapticOptions);
    // Optionally open actions/reactions here
  };

  return (
    <>
      <View style={[styles.row, alignStyle]}>
        {showAvatar && avatarUri && !isSent && (
          <Image source={typeof avatarUri === 'string' ? { uri: avatarUri } : require('../../assets/images/default-avatar.png')} style={styles.avatar} />
        )}
        <Animated.View style={bubbleAnimatedStyle}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleBubblePress} onLongPress={handleBubbleLongPress}>
            {AnimatedBubble}
          </TouchableOpacity>
        </Animated.View>
        {showAvatar && avatarUri && isSent && (
          <Image source={typeof avatarUri === 'string' ? { uri: avatarUri } : require('../../assets/images/default-avatar.png')} style={styles.avatar} />
        )}
      </View>
      {/* Media Modal for image/video */}
      <Modal
        visible={mediaModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaModal({ visible: false, type: null })}
      >
        <View style={styles.mediaModalBg}>
          <View style={styles.mediaModalGlass}>
            {mediaModal.type === 'image' && mediaModal.uri && (
              <Image source={typeof mediaModal.uri === 'string' ? { uri: mediaModal.uri } : undefined} style={styles.mediaModalImage} resizeMode="contain" />
            )}
            {mediaModal.type === 'video' && mediaModal.uri && (
              <Video
                source={{ uri: mediaModal.uri }}
                style={styles.mediaModalVideo}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            )}
            <TouchableOpacity onPress={() => setMediaModal({ visible: false, type: null })} style={styles.mediaModalCloseBtn}>
              <Ionicons name="close-circle" size={36} color="#FF00EA" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  sent: {
    justifyContent: 'flex-end',
  },
  received: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginHorizontal: 4,
    minHeight: 40,
    minWidth: 48,
  },
  bubbleSent: {
    borderTopRightRadius: 6,
  },
  bubbleReceived: {
    borderTopLeftRadius: 6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  image: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#00FFF7',
    shadowColor: '#FF00EA',
    shadowRadius: 12,
    shadowOpacity: 0.7,
    elevation: 8,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  reaction: {
    fontSize: 16,
    marginRight: 4,
  },
  reactionGlow: {
    fontSize: 18,
    marginRight: 6,
    textShadowColor: '#00FFF7',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
    color: '#FFFB00',
    fontWeight: 'bold',
  },
  statusIcon: {
    position: 'absolute',
    right: 8,
    bottom: 6,
    zIndex: 2,
  },
  videoThumbContainer: {
    width: 180,
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#00FFF7',
    shadowColor: '#FF00EA',
    shadowRadius: 12,
    shadowOpacity: 0.7,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10,0,30,0.15)',
  },
  playIcon: {
    textShadowColor: '#FF00EA',
    textShadowRadius: 12,
  },
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: '#00FFF7',
    shadowColor: '#FF00EA',
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 6,
  },
  fileIcon: {
    marginRight: 10,
  },
  fileName: {
    color: '#FFFB00',
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: '#00FFF7',
    textShadowRadius: 6,
  },
  mediaModalBg: {
    flex: 1,
    backgroundColor: 'rgba(10,0,30,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaModalGlass: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 24,
    padding: 12,
    borderWidth: 2,
    borderColor: '#00FFF7',
    shadowColor: '#00FFF7',
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
    alignItems: 'center',
    maxWidth: '95%',
    maxHeight: '80%',
  },
  mediaModalImage: {
    width: 320,
    height: 320,
    borderRadius: 18,
    marginBottom: 12,
  },
  mediaModalVideo: {
    width: 320,
    height: 320,
    borderRadius: 18,
    marginBottom: 12,
  },
  mediaModalCloseBtn: {
    marginTop: 8,
  },
}); 