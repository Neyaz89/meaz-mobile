import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, PanResponder, Animated as ProgressAnimated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useStoriesStore } from '../../store/storiesStore';
import { useTheme } from '../ThemeContext';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { PollStory } from './PollStory';
import { ViewerList } from './ViewerList';

const { width, height } = Dimensions.get('window');

export type StoryContent = {
  type: 'image' | 'video' | 'text' | 'poll' | 'music' | 'sticker';
  url?: string;
  text?: string;
  duration?: number; // ms
  backgroundColor?: string;
  textStyle?: any;
  poll?: {
    question: string;
    options: string[];
  };
  music?: any;
  sticker?: any;
};

export type Story = {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  content: StoryContent[];
  createdAt: string;
  viewers?: string[];
};

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex, onClose }) => {
  const { theme, fontSize, colorBlindMode } = useTheme();
  const effectiveTheme = colorBlindMode !== 'none' ? colorBlindMode : theme;
  const themeColors = Colors[effectiveTheme] || Colors.light;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [currentContentIndex, setCurrentContentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new ProgressAnimated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | number | null>(null);
  const [showViewerList, setShowViewerList] = useState(false);
  const { addViewer, addReaction } = useStoriesStore();
  const { user } = useAuthStore();
  const userId = user?.id;
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [viewerProfiles, setViewerProfiles] = useState<{ id: string; name: string; avatar: string }[]>([]);

  const currentStory = stories[currentIndex];
  const currentContent = currentStory?.content[currentContentIndex];

  // Move emojiScales and animatedStyles initialization here
  // Instead of using .map or .reduce with hooks, do this:
  const scale0 = useSharedValue(1);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  const scale5 = useSharedValue(1);

  const style0 = useAnimatedStyle(() => ({ transform: [{ scale: scale0.value }] }));
  const style1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }] }));
  const style2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }] }));
  const style3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }] }));
  const style4 = useAnimatedStyle(() => ({ transform: [{ scale: scale4.value }] }));
  const style5 = useAnimatedStyle(() => ({ transform: [{ scale: scale5.value }] }));

  const emojiScales = {
    [QUICK_REACTIONS[0]]: scale0,
    [QUICK_REACTIONS[1]]: scale1,
    [QUICK_REACTIONS[2]]: scale2,
    [QUICK_REACTIONS[3]]: scale3,
    [QUICK_REACTIONS[4]]: scale4,
    [QUICK_REACTIONS[5]]: scale5,
  };
  const animatedStyles = {
    [QUICK_REACTIONS[0]]: style0,
    [QUICK_REACTIONS[1]]: style1,
    [QUICK_REACTIONS[2]]: style2,
    [QUICK_REACTIONS[3]]: style3,
    [QUICK_REACTIONS[4]]: style4,
    [QUICK_REACTIONS[5]]: style5,
  };
  const hapticOptions = { enableVibrateFallback: true, ignoreAndroidSystemSettings: false };

  const fontSizeMap = { small: 16, medium: 22, large: 28 };

  // Progress bar animation
  useEffect(() => {
    if (!currentContent || isPaused) return;
    progressAnim.setValue(0);
    ProgressAnimated.timing(progressAnim, {
      toValue: 1,
      duration: currentContent.duration || 5000,
      useNativeDriver: false,
    }).start(({ finished }: { finished?: boolean }) => {
      if (finished) nextContent();
    });
    // Cleanup
    return () => { (progressAnim as any).stopAnimation && (progressAnim as any).stopAnimation(); };
  }, [currentContentIndex, currentIndex, isPaused]);

  // Auto-advance timer (for text/image)
  useEffect(() => {
    if (!currentContent || isPaused || currentContent.type === 'video') return;
    if (timerRef.current) clearTimeout(timerRef.current as number);
    timerRef.current = setTimeout(() => {
      nextContent();
    }, currentContent.duration || 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current as number); };
  }, [currentContentIndex, currentIndex, isPaused]);

  // Track viewers
  useEffect(() => {
    if (!userId || !currentStory) return;
    if (!viewedStories.has(currentStory.id)) {
      addViewer(currentStory.id, userId);
      setViewedStories((prev) => new Set(prev).add(currentStory.id));
    }
  }, [currentStory?.id, userId]);

  // Fetch viewer profiles when modal is shown
  useEffect(() => {
    const fetchViewerProfiles = async () => {
      if (!showViewerList || !currentStory?.viewers || currentStory.viewers.length === 0) {
        setViewerProfiles([]);
        return;
      }
      const { data } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', currentStory.viewers);
      if (data) {
        setViewerProfiles(data.map((u: any) => ({ id: u.id, name: u.display_name || 'Unknown', avatar: u.avatar_url || '' })));
      }
    };
    fetchViewerProfiles();
  }, [showViewerList, currentStory?.viewers]);

  const nextContent = () => {
    if (currentContentIndex < currentStory.content.length - 1) {
      setCurrentContentIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      nextStory();
    }
  };

  const prevContent = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      prevStory();
    }
  };

  const nextStory = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentContentIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setCurrentContentIndex(0);
      setProgress(0);
    }
  };

  // PanResponder for swipe navigation
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) prevStory();
        else if (gestureState.dx < -50) nextStory();
      },
    })
  ).current;

  // Reaction handler (extend to call backend)
  const handleReaction = (emoji: string) => {
    if (!userId || !currentStory) return;
    addReaction(currentStory.id, userId, emoji);
    // Optionally: Optimistic UI update (not shown here)
  };

  // Animated reaction
  const handleReactionAnimated = (emoji: string) => {
    emojiScales[emoji].value = withSequence(withSpring(1.3), withSpring(1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleReaction(emoji);
  };

  // Animated swipe
  const handleSwipe = (direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (direction === 'left') nextStory();
    else prevStory();
  };

  // Render story content
  const renderContent = () => {
    if (!currentContent) return null;
    if (currentContent.type === 'image' && currentContent.url) {
      return (
        <Image source={{ uri: currentContent.url }} style={styles.storyMedia} resizeMode="cover" />
      );
    }
    if (currentContent.type === 'text' && currentContent.text) {
      // Defensive check for fontSize
      let safeTextStyle = { ...currentContent.textStyle };
      if (safeTextStyle.fontSize !== undefined && safeTextStyle.fontSize <= 0) {
        safeTextStyle.fontSize = fontSizeMap[fontSize]; // fallback to theme font size
      } else {
        safeTextStyle.fontSize = fontSizeMap[fontSize];
      }
      return (
        <View style={[styles.textStory, { backgroundColor: currentContent.backgroundColor || themeColors.background }]}> 
          <ThemedText style={[styles.textStoryText, safeTextStyle]}>{currentContent.text}</ThemedText>
        </View>
      );
    }
    if (currentContent.type === 'poll' && currentContent.poll) {
      // Map string[] to PollStory option objects
      const poll = currentContent.poll;
      const options = Array.isArray(poll.options)
        ? poll.options.map((opt, i) => typeof opt === 'string' ? { id: String(i), text: opt, votes: 0 } : opt)
        : [];
      return <PollStory question={poll.question} options={options} onVote={() => {}} />;
    }
    if (currentContent.type === 'music' && currentContent.music) {
      // TODO: Render music story UI
      return <View><Text>Music Story (coming soon)</Text></View>;
    }
    if (currentContent.type === 'sticker' && currentContent.sticker) {
      // TODO: Render sticker story UI
      return <View><Text>Sticker Story (coming soon)</Text></View>;
    }
    return null;
  };

  // Safety check - don't render if user is not available
  if (!user) {
    return (
      <View style={styles.overlay}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading user data...</ThemedText>
        </View>
      </View>
    );
  }

  if (!currentStory || !currentContent) return null;

  return (
    <ThemedView style={[styles.overlay, { backgroundColor: themeColors.background }]} {...panResponder.panHandlers}>
      {/* Progress Bars */}
      <View style={styles.progressRow}>
        {currentStory.content.map((_, idx) => (
          <View key={idx} style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: idx < currentContentIndex ? '100%' : idx === currentContentIndex ? progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) : '0%',
                  backgroundColor: themeColors.accent || themeColors.tint,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: currentStory.user.avatar }} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <ThemedText style={styles.userName}>{currentStory.user.name}</ThemedText>
          <ThemedText style={styles.timeAgo}>{currentStory.createdAt}</ThemedText>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowViewerList(true)} style={styles.viewerListBtn}>
          <Ionicons name="eye" size={22} color={themeColors.icon} />
        </TouchableOpacity>
      </View>
      {/* Story Content */}
      <View style={styles.contentContainer}>{renderContent()}</View>
      {/* Quick Reactions */}
      <View style={styles.reactionsRow}>
        {QUICK_REACTIONS.map((emoji) => (
          <Animated.View key={emoji} style={animatedStyles[emoji]}>
            <TouchableOpacity onPress={() => handleReactionAnimated(emoji)}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
      {/* Reply Input */}
      <View style={[styles.replyBar, { backgroundColor: themeColors.card || themeColors.background, borderColor: themeColors.border || themeColors.icon }]}> 
        <TextInput
          style={[styles.replyInput, { color: themeColors.text }]}
          placeholder="Send a reply..."
          placeholderTextColor={themeColors.icon}
          value={replyText}
          onChangeText={setReplyText}
        />
        <TouchableOpacity>
          <Ionicons name="send" size={24} color={themeColors.tint} />
        </TouchableOpacity>
      </View>
      {showViewerList && (
        <View style={styles.viewerListModal}>
          <ViewerList viewers={viewerProfiles} />
          <TouchableOpacity onPress={() => setShowViewerList(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={themeColors.text} />
          </TouchableOpacity>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  progressRow: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
    borderRadius: 1,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  header: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timeAgo: {
    fontSize: 12,
    color: '#ccc',
  },
  closeBtn: {
    padding: 8,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 100,
  },
  storyMedia: {
    width: width,
    height: height * 0.7,
    borderRadius: 16,
    backgroundColor: '#000',
  },
  textStory: {
    width: width * 0.9,
    height: height * 0.6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  textStoryText: {
    fontSize: 28,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 10,
  },
  reactionEmoji: {
    fontSize: 28,
    marginHorizontal: 8,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
  },
  replyInput: {
    flex: 1,
    fontSize: 16,
    marginRight: 8,
  },
  viewerListBtn: {
    padding: 8,
  },
  viewerListModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

// Extension points:
// - Add story viewers for polls, music, stickers, etc.
// - Add animated backgrounds or overlays per theme
// - Add haptic feedback, accessibility, etc. 