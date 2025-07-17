import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MessageReaction } from '../../types';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReactionPress: (reaction: string) => void;
  onReactionLongPress?: (reaction: string) => void;
  currentUserId: string;
  messageId: string;
}

const COMMON_REACTIONS = ['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🎉'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReactionPress,
  onReactionLongPress,
  currentUserId,
  messageId,
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleReactionPress = (reaction: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate the reaction button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onReactionPress(reaction);
    setShowReactionPicker(false);
  };

  const handleLongPress = (reaction: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReactionLongPress?.(reaction);
  };

  const hasUserReacted = (reaction: MessageReaction) => {
    return reaction.users.includes(currentUserId);
  };

  const getReactionColor = (reaction: MessageReaction) => {
    if (hasUserReacted(reaction)) {
      return '#FF6B35'; // User's reaction is highlighted
    }
    return '#666'; // Default color
  };

  const getReactionBackground = (reaction: MessageReaction) => {
    if (hasUserReacted(reaction)) {
      return 'rgba(255, 107, 53, 0.1)'; // User's reaction has background
    }
    return 'rgba(0, 0, 0, 0.05)'; // Default background
  };

  return (
    <View style={styles.container}>
      {/* Existing Reactions */}
      <View style={styles.reactionsContainer}>
        {reactions.map((reaction, index) => (
          <TouchableOpacity
            key={`${reaction.emoji}-${index}`}
            style={[
              styles.reactionButton,
              {
                backgroundColor: getReactionBackground(reaction),
                borderColor: hasUserReacted(reaction) ? '#FF6B35' : 'transparent',
              },
            ]}
            onPress={() => handleReactionPress(reaction.emoji)}
            onLongPress={() => handleLongPress(reaction.emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            <Text style={[styles.reactionCount, { color: getReactionColor(reaction) }]}>
              {reaction.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Reaction Button */}
      <TouchableOpacity
        style={styles.addReactionButton}
        onPress={() => setShowReactionPicker(!showReactionPicker)}
        activeOpacity={0.7}
      >
        <Ionicons name="add-circle-outline" size={20} color="#666" />
      </TouchableOpacity>

      {/* Reaction Picker */}
      {showReactionPicker && (
        <Animated.View style={[styles.reactionPicker, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.reactionPickerContent}>
            {COMMON_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.pickerReaction}
                onPress={() => handleReactionPress(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pickerArrow} />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    position: 'relative',
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 32,
    justifyContent: 'center',
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
  },
  addReactionButton: {
    padding: 4,
    marginLeft: 4,
  },
  reactionPicker: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 8,
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
  reactionPickerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 200,
  },
  pickerReaction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  pickerEmoji: {
    fontSize: 20,
  },
  pickerArrow: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
}); 