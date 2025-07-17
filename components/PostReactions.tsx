import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PostReaction {
  emoji: string;
  count: number;
  users: string[];
}

interface PostReactionsProps {
  reactions: PostReaction[];
  onReact: (emoji: string) => void;
  currentUserId: string;
}

const COMMON_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🎉'];
const CONFETTI_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6F91', '#845EC2'];

const PostReactions: React.FC<PostReactionsProps> = ({ reactions, onReact, currentUserId }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [confetti, setConfetti] = useState<{ x: number; y: number; key: number }[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const pickerAnim = useRef(new Animated.Value(0)).current;
  const confettiKey = useRef(0);

  // Find the emoji the user picked
  const userReaction = reactions.find(r => r.users.includes(currentUserId));
  const userEmoji = userReaction?.emoji;

  // Animation refs for each emoji
  const scaleAnims = useRef<{ [emoji: string]: Animated.Value }>({}).current;
  COMMON_REACTIONS.forEach(emoji => {
    if (!scaleAnims[emoji]) scaleAnims[emoji] = new Animated.Value(1);
  });

  // Animate when user changes reaction
  useEffect(() => {
    if (userEmoji) {
      Animated.sequence([
        Animated.timing(scaleAnims[userEmoji], { toValue: 1.3, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnims[userEmoji], { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [userEmoji]);

  // Animate picker in/out
  useEffect(() => {
    Animated.timing(pickerAnim, {
      toValue: showPicker ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, [showPicker]);

  // Play sound effect
  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/ringtone.mp3'), // Use your own short pop/chime sound
        { shouldPlay: true }
      );
      setSound(sound);
    } catch {}
  };
  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  // Confetti burst
  const triggerConfetti = () => {
    const burst = Array.from({ length: 12 }).map((_, i) => ({
      x: Math.cos((2 * Math.PI * i) / 12),
      y: Math.sin((2 * Math.PI * i) / 12),
      key: confettiKey.current++
    }));
    setConfetti(burst);
    setTimeout(() => setConfetti([]), 900);
  };

  // Handle emoji pick
  const handlePick = (emoji: string) => {
    setShowPicker(false);
    onReact(emoji);
    playSound();
    triggerConfetti();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, marginBottom: 8, position: 'relative' }}>
      {reactions.map((reaction) => {
        const isUser = reaction.emoji === userEmoji;
        return (
          <TouchableOpacity
            key={reaction.emoji}
            style={[
              styles.reactionButton,
              isUser && styles.userReactionButton,
            ]}
            onPress={() => handlePick(reaction.emoji)}
            activeOpacity={0.7}
          >
            <Animated.Text style={[styles.reactionEmoji, { transform: [{ scale: scaleAnims[reaction.emoji] || 1 }] }]}> {reaction.emoji} </Animated.Text>
            <Animated.Text style={[styles.reactionCount, isUser && styles.userReactionCount]}> {reaction.count} </Animated.Text>
            {isUser && <Ionicons name="checkmark-circle" size={16} color="#007AFF" style={{ marginLeft: 2 }} />}
          </TouchableOpacity>
        );
      })}
      {/* Add Reaction Button */}
      <TouchableOpacity
        style={styles.addReactionButton}
        onPress={() => setShowPicker(!showPicker)}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={20} color="#666" />
      </TouchableOpacity>
      {/* Animated Picker */}
      {showPicker && (
        <Animated.View
          style={[
            styles.picker,
            {
              opacity: pickerAnim,
              transform: [
                { scale: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                { translateY: pickerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.pickerRow}>
            {COMMON_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.pickerEmojiBtn}
                onPress={() => handlePick(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}
      {/* Confetti Burst */}
      {confetti.length > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {confetti.map((c, i) => (
            <Animated.View
              key={c.key}
              style={[
                styles.confetti,
                {
                  backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                  left: 20,
                  top: 0,
                  transform: [
                    { translateX: new Animated.Value(0).interpolate({ inputRange: [0, 1], outputRange: [0, c.x * 60] }) },
                    { translateY: new Animated.Value(0).interpolate({ inputRange: [0, 1], outputRange: [0, c.y * 60] }) },
                    { scale: new Animated.Value(0).interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
                  ],
                  opacity: new Animated.Value(0).interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 32,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderColor: 'transparent',
    marginRight: 4,
  },
  userReactionButton: {
    backgroundColor: 'rgba(0,122,255,0.12)',
    borderColor: '#007AFF',
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 12,
    textAlign: 'center',
    color: '#666',
  },
  userReactionCount: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  addReactionButton: {
    padding: 4,
    marginLeft: 4,
  },
  picker: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerEmojiBtn: {
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 2,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  pickerEmoji: {
    fontSize: 22,
  },
  confetti: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default PostReactions; 