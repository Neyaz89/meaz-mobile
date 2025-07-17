import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { ResizeMode, Video } from 'expo-av';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PostOptionsMenu from './PostOptionsMenu';
import PostReactions from './PostReactions';
import UserAvatar from './UserAvatar';

interface PostCardProps {
  post: any;
  user: any;
  analytics: any;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onSave: () => void;
  onPin: () => void;
  onMore: () => void;
  onPressTag: (tag: string) => void;
  onPressMention: (mention: string) => void;
  onTranslate: () => void;
  isPinned: boolean;
  isSaved: boolean;
  isLiked: boolean;
  isOwnPost: boolean;
  reactions: any[];
  onReact: (emoji: string) => void;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onMute: () => void;
  onFollow: () => void;
  onBlock: () => void;
  onAddToStory: () => void;
  showTranslation: boolean;
  translation: string | null;
}

// Utility to parse hashtags/mentions
function parseCaption(text: string, onPressTag: (tag: string) => void, onPressMention: (mention: string) => void) {
  const regex = /([#@][\w]+)/g;
  const parts = text.split(regex);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      return <Text key={i} style={styles.hashtag} onPress={() => onPressTag(part)}>{part}</Text>;
    } else if (part.startsWith('@')) {
      return <Text key={i} style={styles.mention} onPress={() => onPressMention(part)}>{part}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  user,
  analytics,
  onLike,
  onComment,
  onShare,
  onSave,
  onPin,
  onMore,
  onPressTag,
  onPressMention,
  onTranslate,
  isPinned,
  isSaved,
  isLiked,
  isOwnPost,
  reactions,
  onReact,
  currentUserId,
  onEdit,
  onDelete,
  onReport,
  onMute,
  onFollow,
  onBlock,
  onAddToStory,
  showTranslation,
  translation,
}) => {
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const media = post.media && post.media[0];
  const audioUrl = post.audio_url;
  const caption = post.caption || '';
  const displayCaption = showFullCaption || caption.length < 120 ? caption : caption.slice(0, 120) + '...';
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <View style={[styles.card, isPinned && styles.pinnedCard]}>
      {/* Header */}
      <View style={styles.header}>
        <UserAvatar user={user} size={36} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName}>{user?.display_name || user?.username || 'User'}</Text>
          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>
        {isPinned && <Ionicons name="pin" size={20} color="#f7b731" style={{ marginRight: 8 }} />}
        <TouchableOpacity onPress={() => setShowOptions(true)}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#888" />
        </TouchableOpacity>
      </View>
      {/* Media */}
      {media && media.type === 'image' && (
        <Image source={{ uri: media.url }} style={styles.media} resizeMode="cover" />
      )}
      {media && media.type === 'video' && (
        <Video source={{ uri: media.url }} style={styles.media} resizeMode={ResizeMode.COVER} useNativeControls />
      )}
      {audioUrl && (
        <TouchableOpacity style={styles.audioPlayer} onPress={() => setAudioPlaying(!audioPlaying)}>
          <Ionicons name={audioPlaying ? 'pause' : 'play'} size={28} color="#007AFF" />
          <Text style={{ marginLeft: 8 }}>{audioPlaying ? 'Pause Audio' : 'Play Audio'}</Text>
        </TouchableOpacity>
      )}
      {/* Caption */}
      <Text style={styles.caption}>
        {parseCaption(displayCaption, onPressTag, onPressMention)}
        {caption.length > 120 && !showFullCaption && (
          <Text style={styles.seeMore} onPress={() => setShowFullCaption(true)}> See more</Text>
        )}
      </Text>
      {/* Translation */}
      {showTranslation && translation && (
        <View style={styles.translationBox}>
          <Text style={styles.translationText}>{translation}</Text>
        </View>
      )}
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onLike} style={styles.actionBtn}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? '#e74c3c' : '#888'} />
          <Text style={[styles.actionText, isLiked && { color: '#e74c3c', fontWeight: 'bold' }]}>{analytics?.likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onComment} style={styles.actionBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#888" />
          <Text style={styles.actionText}>{analytics?.comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={styles.actionBtn}>
          <Ionicons name="share-social-outline" size={22} color="#888" />
          <Text style={styles.actionText}>{analytics?.shares || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSave} style={styles.actionBtn}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={isSaved ? '#007AFF' : '#888'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPin} style={styles.actionBtn}>
          <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={22} color={isPinned ? '#f7b731' : '#888'} />
        </TouchableOpacity>
      </View>
      {/* Quick Reactions */}
      <PostReactions reactions={reactions} onReact={onReact} currentUserId={currentUserId} />
      {/* Contextual Menu */}
      <PostOptionsMenu
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        onEdit={onEdit}
        onDelete={onDelete}
        onReport={onReport}
        onMute={onMute}
        onFollow={onFollow}
        onBlock={onBlock}
        onAddToStory={onAddToStory}
        isOwnPost={isOwnPost}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
    marginBottom: 8,
    padding: 0,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  pinnedCard: {
    borderColor: '#f7b731',
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  displayName: {
    fontWeight: 'bold',
    color: '#222',
    fontSize: 16,
  },
  timestamp: {
    color: '#888',
    fontSize: 12,
  },
  media: {
    width: '100%',
    height: 320,
    backgroundColor: '#eee',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  audioPlayer: {
    width: '100%',
    height: 60,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  caption: {
    padding: 12,
    fontSize: 15,
    color: '#222',
  },
  seeMore: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  hashtag: {
    color: '#007AFF',
  },
  mention: {
    color: '#f7b731',
  },
  translationBox: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 8,
  },
  translationText: {
    color: '#444',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionText: {
    marginLeft: 6,
    color: '#888',
  },
});

export default PostCard; 