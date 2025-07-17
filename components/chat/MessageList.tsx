import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';
import { MessageBubble } from './MessageBubble';

export interface MessageListProps {
  messages: any[];
  renderMessage?: (item: any) => React.ReactElement;
  onEndReached?: () => void;
  isLoading?: boolean;
  ListHeaderComponent?: React.ReactElement;
  userId: string;
  seenStatus?: Record<string, string[]>;
  deliveredStatus?: Record<string, string[]>;
  starredMessages?: string[];
  pinnedMessage?: any;
  onReply?: (msg: any) => void;
  onLongPress?: (msg: any) => void;
  onStar?: (msg: any) => void;
  onPin?: (msg: any) => void;
  onDelete?: (msg: any) => void;
  onForward?: (msg: any) => void;
  onCopy?: (msg: any) => void;
  onReact?: (msg: any, emoji: string) => void;
  onPress?: (msg: any) => void;
  onSwipeReply?: (msg: any) => void;
  onPlayVoice?: (msg: any) => void;
  onImagePress?: (msg: any) => void;
  onFilePress?: (msg: any) => void;
  firstUnreadMessageId?: string | null;
  searchTerm?: string;
  highlightedMessageId?: string | null;
}

// Helper to group messages by date
function groupMessagesByDate(messages: any[]) {
  const groups: { [date: string]: any[] } = {};
  messages.forEach(msg => {
    const date = new Date(msg.createdAt || msg.created_at).toISOString().split('T')[0];
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return groups;
}

// Helper to get human-friendly date
function getFriendlyDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  renderMessage,
  onEndReached,
  isLoading,
  ListHeaderComponent,
  userId,
  seenStatus,
  deliveredStatus,
  starredMessages = [],
  pinnedMessage,
  onReply = () => {},
  onLongPress = () => {},
  onStar = () => {},
  onPin = () => {},
  onDelete = () => {},
  onForward = () => {},
  onCopy = () => {},
  onReact = () => {},
  onPress = () => {},
  onSwipeReply = () => {},
  onPlayVoice = () => {},
  onImagePress = () => {},
  onFilePress = () => {},
  firstUnreadMessageId = null,
  searchTerm,
  highlightedMessageId,
}) => {
  // Group messages by date
  // Instead of grouping, iterate through messages in order and insert date header only above the first message of each day
  const flatListData: any[] = [];
  let unreadDividerInserted = false;
  let lastDate: string | null = null;
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const msgDate = new Date(msg.createdAt || msg.created_at).toISOString().split('T')[0];
    const showAvatar = true;
    // Insert date header if this is the first message of a new day
    if (msgDate !== lastDate) {
      flatListData.push({ type: 'header', date: msgDate });
      lastDate = msgDate;
    }
    // Only show unread divider if firstUnreadMessageId is set, this message is the first unread, and it is NOT sent by the current user
    if (
      !unreadDividerInserted &&
      firstUnreadMessageId &&
      msg.id === firstUnreadMessageId &&
      msg.senderId !== userId // Only for received messages
    ) {
      flatListData.push({ type: 'unread_divider', id: 'unread-divider' });
      unreadDividerInserted = true;
    }
    flatListData.push({ type: 'message', ...msg, showAvatar });
  }

  const renderItem = ({ item }: any) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateHeaderContainer}>
          <ThemedText style={styles.dateHeaderText}>{getFriendlyDate(item.date)}</ThemedText>
        </View>
      );
    } else if (item.type === 'unread_divider') {
      return (
        <View style={styles.unreadDividerContainer}>
          <LinearGradient
            colors={["#ffecd2", "#fcb69f", "#a1c4fd", "#c2e9fb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.unreadDividerGradient}
          >
            <Ionicons name="sparkles" size={20} color="#ff7e5f" style={{ marginRight: 8 }} />
            <ThemedText style={styles.unreadDividerText}>Unread messages</ThemedText>
            <Ionicons name="sparkles" size={20} color="#43cea2" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </View>
      );
    } else if (renderMessage) {
      return renderMessage(item);
    } else {
      const isOwn = item.senderId === userId;
      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          showAvatar={item.showAvatar}
          onLongPress={onLongPress}
          onReply={() => onReply(item)}
          onStar={() => onStar(item)}
          onPin={() => onPin(item)}
          onDelete={() => onDelete(item)}
          onForward={() => onForward(item)}
          onCopy={() => onCopy(item)}
          onReact={onReact}
          seenStatus={seenStatus && seenStatus[item.id]}
          deliveredStatus={deliveredStatus && deliveredStatus[item.id]}
          replyTo={item.replyTo}
          reactions={item.reactions}
          isStarred={starredMessages.includes(item.id)}
          isPinned={pinnedMessage && pinnedMessage.id === item.id}
          onPress={() => onPress(item)}
          onSwipeReply={() => onSwipeReply(item)}
          onPlayVoice={() => onPlayVoice(item)}
          onImagePress={() => onImagePress(item)}
          onFilePress={() => onFilePress(item)}
          searchTerm={searchTerm}
          highlight={highlightedMessageId === item.id}
        />
      );
    }
  };

  return (
    <FlatList
      data={flatListData}
      renderItem={renderItem}
      keyExtractor={item => item.type === 'header' ? `header-${item.date}` : item.id}
      inverted
      onEndReached={onEndReached}
      onEndReachedThreshold={0.2}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  dateHeaderContainer: { alignItems: 'center', marginVertical: 8 },
  dateHeaderText: { fontSize: 13, color: '#888', fontWeight: 'bold' },
  unreadDividerContainer: {
    alignItems: 'center',
    marginVertical: 18,
    justifyContent: 'center',
  },
  unreadDividerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
  },
  unreadDividerText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 1,
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
}); 