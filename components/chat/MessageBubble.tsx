import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Message } from '../../types';
import { ThemedText } from '../ThemedText';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  onLongPress: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onStar: (msg: Message) => void;
  onPin: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onCopy: (msg: Message) => void;
  onReact: (msg: Message, reaction: string) => void;
  seenStatus?: string[];
  deliveredStatus?: string[];
  replyTo?: Message;
  reactions?: any[];
  isStarred?: boolean;
  isPinned?: boolean;
  onPress?: () => void;
  onSwipeReply?: (msg: Message) => void;
  onPlayVoice?: (msg: Message) => void;
  onImagePress?: () => void;
  onFilePress?: () => void;
  searchTerm?: string;
  highlight?: boolean;
  onViewThread?: (msg: Message) => void;
  showAvatar?: boolean;
}

export const MessageBubble: React.FC<Omit<MessageBubbleProps, 'isFirstInGroup' | 'isLastInGroup'> & { isOwn: boolean }> = ({
  message,
  isOwn,
  onLongPress,
  onReply,
  onStar,
  onPin,
  onDelete,
  onForward,
  onCopy,
  onReact,
  seenStatus,
  deliveredStatus,
  replyTo,
  reactions,
  isStarred,
  isPinned,
  onPress,
  onSwipeReply,
  onPlayVoice,
  onImagePress,
  onFilePress,
  searchTerm,
  highlight,
  onViewThread,
  showAvatar,
}) => {
  // Helper to render text with highlights for mentions, hashtags, and search
  const renderTextWithMentionsAndHighlight = (text: string) => {
    const regex = /([@#][\w]+)/g;
    const parts = text.split(regex);
    let final: React.ReactNode[] = [];
    parts.forEach((part, idx) => {
      if (/^@[\w]+$/.test(part)) {
        final.push(
          <Text
            key={"mention-" + idx}
            style={[styles.mention, { backgroundColor: '#e0e7ff', color: '#007AFF', fontWeight: 'bold', borderRadius: 4, paddingHorizontal: 3 }]}
            onPress={() => {/* TODO: openProfile(part.slice(1)) */}}
          >
            {part}
          </Text>
        );
      } else if (/^#[\w]+$/.test(part)) {
        final.push(
          <Text
            key={"hashtag-" + idx}
            style={styles.hashtag}
            onPress={() => {/* TODO: openHashtag(part.slice(1)) */}}
          >
            {part}
          </Text>
        );
      } else if (highlight && searchTerm && searchTerm.length > 0) {
        // Highlight all occurrences of searchTerm (case-insensitive)
        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        const subparts = part.split(regex);
        subparts.forEach((sub, subIdx) => {
          if (sub.toLowerCase() === searchTerm.toLowerCase()) {
            final.push(
              <Text key={`highlight-${idx}-${subIdx}`} style={styles.highlight}>{sub}</Text>
            );
          } else if (sub.length > 0) {
            final.push(<Text key={`plain-${idx}-${subIdx}`}>{sub}</Text>);
          }
        });
      } else {
        final.push(<Text key={"plain-" + idx}>{part}</Text>);
      }
    });
    return final;
  };

  // Render message content by type
  let content;
  if (message.isDeleted) {
    content = <Text style={styles.deleted}>[deleted]</Text>;
  } else if (message.type === 'image') {
    content = (
      <TouchableOpacity onPress={onImagePress}>
        <Image source={{ uri: message.content }} style={styles.image} />
      </TouchableOpacity>
    );
  } else if (message.type === 'file') {
    content = (
      <TouchableOpacity onPress={onFilePress} style={styles.file}>
        <Ionicons name="document-outline" size={24} color="#007AFF" />
        <ThemedText>File</ThemedText>
      </TouchableOpacity>
    );
  } else if (message.type === 'voice') {
    content = (
      <TouchableOpacity onPress={() => onPlayVoice && onPlayVoice(message)} style={styles.voice}>
        <Ionicons name="mic" size={24} color="#007AFF" />
        <ThemedText>Voice message</ThemedText>
      </TouchableOpacity>
    );
  } else if (message.type === 'gif') {
    content = (
      <Image source={{ uri: message.content }} style={styles.gif} />
    );
  } else if (message.type === 'poll') {
    content = (
      <View style={styles.poll}><ThemedText>Poll</ThemedText></View>
    );
  } else {
    content = <ThemedText>{renderTextWithMentionsAndHighlight(message.content)}{message.isEdited && <Text style={styles.editedLabel}> (edited)</Text>}</ThemedText>;
  }

  // Render reactions
  const renderReactions = () => (
    reactions && reactions.length > 0 ? (
      <View style={styles.reactionsRow}>
        {reactions.map((r, idx) => (
          <TouchableOpacity key={idx} onPress={() => onReact(message, r.emoji)}>
            <Text style={styles.reaction}>{r.emoji} {r.count > 1 ? r.count : ''}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ) : null
  );

  // Render avatar if showAvatar is true
  const avatarUri = (message as any).avatar || ((message as any).user && (message as any).user.avatar_url) || undefined;
  const renderAvatar = () => showAvatar && avatarUri ? (
    <Image source={{ uri: avatarUri }} style={styles.avatar} />
  ) : showAvatar ? (
    <View style={[styles.avatar, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
      <Ionicons name="person-circle" size={28} color="#bbb" />
    </View>
  ) : null;

  // Render timestamp
  const renderTimestamp = () => (
    <Text style={styles.timestamp}>{new Date(message.createdAt || (message as any).created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
  );

  // Render status ticks
  const renderStatus = () => {
    if (!isOwn) return null;
    if (seenStatus && seenStatus.includes(message.id)) {
      return <Ionicons name="checkmark-done" size={16} color="#34C759" />;
    } else if (deliveredStatus && deliveredStatus.includes(message.id)) {
      return <Ionicons name="checkmark" size={16} color="#007AFF" />;
    }
    return null;
  };

  // Render reply preview
  const renderReply = () => (
    replyTo ? (
      <View style={styles.replyPreviewEnhanced}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="return-up-back" size={16} color="#007AFF" style={{ marginRight: 4 }} />
          <ThemedText style={styles.replyTextEnhanced} numberOfLines={1}>
            {replyTo.content.length > 60 ? replyTo.content.substring(0, 60) + '…' : replyTo.content}
          </ThemedText>
        </View>
        {onViewThread && (
          <TouchableOpacity onPress={() => onViewThread(message)} style={styles.viewThreadButton}>
            <Text style={styles.viewThreadText}>View Thread</Text>
          </TouchableOpacity>
        )}
      </View>
    ) : null
  );

  // Bubble style (remove group styles, add unique look)
  const bubbleStyle = [
    styles.bubble,
    isOwn ? styles.bubbleOwn : styles.bubbleOther,
    isStarred && styles.starred,
    isPinned && styles.pinned,
    // Removed: isFirstInGroup && styles.firstInGroup,
    // Removed: isLastInGroup && styles.lastInGroup,
  ];

  // Animated scale for new messages and reactions
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 80,
    }).start();
  }, []);
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.08, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true })
    ]).start();
  }, [reactions && reactions.length]);

  return (
    <View style={{ flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: 8 }}>
      {showAvatar && renderAvatar()}
      <Animated.View style={[bubbleStyle, { transform: [{ scale: scaleAnim }] }]}>
    <TouchableOpacity
      onLongPress={() => onLongPress(message)}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {renderReply()}
      {content}
      {renderReactions()}
      {renderStatus()}
          {renderTimestamp()}
          {message.isEdited && <Text style={styles.editedLabel}> (edited)</Text>}
    </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    marginVertical: 10,
    padding: 16,
    borderRadius: 28,
    maxWidth: '80%',
    // Glassmorphism + gradient border
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(0,122,255,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  bubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(52,199,89,0.22)',
    borderColor: 'rgba(52,199,89,0.35)',
    // Add a right-side accent dot
    borderRightWidth: 6,
    borderRightColor: '#34C759',
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,122,255,0.10)',
    borderColor: 'rgba(0,122,255,0.25)',
    // Add a left-side accent dot
    borderLeftWidth: 6,
    borderLeftColor: '#007AFF',
  },
  starred: { borderColor: '#FFD700', borderWidth: 2 },
  pinned: { borderColor: '#007AFF', borderWidth: 2 },
  image: { width: 180, height: 180, borderRadius: 12 },
  gif: { width: 180, height: 180, borderRadius: 12 },
  file: { flexDirection: 'row', alignItems: 'center' },
  voice: { flexDirection: 'row', alignItems: 'center' },
  poll: { padding: 8, backgroundColor: '#e6f7ff', borderRadius: 8 },
  reactionsRow: { flexDirection: 'row', marginTop: 4 },
  reaction: { fontSize: 18, marginRight: 8 },
  replyPreviewEnhanced: { backgroundColor: '#f0f7ff', borderLeftWidth: 4, borderLeftColor: '#007AFF', padding: 6, borderRadius: 8, marginBottom: 4 },
  replyTextEnhanced: { color: '#007AFF', fontWeight: '500', flex: 1 },
  mention: { color: '#007AFF', fontWeight: 'bold' },
  hashtag: { color: '#FF6B35', fontWeight: 'bold' },
  highlight: {
    backgroundColor: '#ffe066',
    color: '#222',
    fontWeight: 'bold',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  viewThreadButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewThreadText: {
    color: '#3b82f6',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deleted: {
    color: '#aaa',
    fontStyle: 'italic',
    fontSize: 15,
  },
  editedLabel: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
}); 