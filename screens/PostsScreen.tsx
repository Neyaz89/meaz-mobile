import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, FlatList, Modal, PanResponder, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import UserAvatar from '../components/UserAvatar';
import {
    addPostComment, deletePostComment, fetchPostComments, fetchPostLikes,
    fetchPostReactions,
    fetchPostShares,
    fetchPostTranslation,
    fetchSavedPosts,
    likePost,
    pinPost,
    reactToPost,
    reportPost,
    savePost,
    sharePost, subscribeToPostComments, subscribeToPostLikes,
    subscribeToPostReactions,
    subscribeToPostShares,
    subscribeToSavedPosts,
    supabase, unlikePost,
    unpinPost,
    unreactToPost,
    unsavePost,
    updatePostTranslation,
    uploadFile
} from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
// 1. Import new components
import { LinearGradient } from 'expo-linear-gradient';
import PostCreateModal from '../components/post/PostCreateModal';
import PostCard from '../components/PostCard';
import StoryCreateModal, { MediaAsset as StoryMediaAsset, PrivacyOption as StoryPrivacyOption } from '../components/stories/StoryCreateModal';

const { width } = Dimensions.get('window');
const ITEM_SIZE = 70;
const SPACING = 16;
const STORY_DURATION = 5000; // ms per story segment

const StoriesCarousel = () => {
  const { user } = useAuthStore();
  const [stories, setStories] = useState<any[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentStory, setCurrentStory] = useState<any>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(new Animated.Value(0));
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [viewersModalVisible, setViewersModalVisible] = useState(false);
  const [viewersProfiles, setViewersProfiles] = useState<any[]>([]);
  const videoRef = useRef<any>(null);
  // Story creation modal state (renamed to avoid conflict)
  const [storyCreateModalVisible, setStoryCreateModalVisible] = useState(false);
  const [storyNewMedia, setStoryNewMedia] = useState<StoryMediaAsset[]>([]);
  const [storyNewCaption, setStoryNewCaption] = useState('');
  const [storyPrivacy, setStoryPrivacy] = useState<StoryPrivacyOption>('friends');
  const [storyUploading, setStoryUploading] = useState(false);
  // Feedback
  const [storyFeedback, setStoryFeedback] = useState<string | undefined>(undefined);

  // Fetch stories from Supabase
  const fetchStories = useCallback(async () => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('stories')
      .select('*, user:users(id, display_name, username, avatar_url)')
      .gte('expires_at', now)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setStories(data);
    }
  }, []);

  // Real-time subscription
  useEffect(() => {
    fetchStories();
    const channel = supabase
      .channel('stories:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, (payload) => {
        fetchStories();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchStories]);

  // Pulse animation for Add Story
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Add "Add Story" item for current user
  const storiesWithAdd = [
    {
      id: 'add',
      user: {
        id: user?.id,
        name: user?.displayName || user?.username || 'You',
        avatar: user?.avatar || null,
      },
      isMe: true,
      viewed: true,
    },
    ...stories.map((story) => ({
      ...story,
      user: {
        id: story.user?.id,
        name: story.user?.displayName || story.user?.username || 'User',
        avatar: story.user?.avatar || null,
      },
      isMe: story.user?.id === user?.id,
      viewed: Array.isArray(story.viewers) && story.viewers.some((v: any) => v === user?.id),
    })),
  ];

  // Pick from gallery
  const storyPickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets) {
      setStoryNewMedia([
        ...storyNewMedia,
        ...result.assets.map((a) => ({
          uri: a.uri,
          type: a.type || 'image',
          fileName: a.fileName || undefined,
        })),
      ]);
    }
  };

  // Launch camera
  const storyLaunchCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets) {
      setStoryNewMedia([
        ...storyNewMedia,
        ...result.assets.map((a) => ({
          uri: a.uri,
          type: a.type || 'image',
          fileName: a.fileName || undefined,
        })),
      ]);
    }
  };

  // Remove media
  const storyRemoveMedia = (index: number) => {
    setStoryNewMedia(storyNewMedia.filter((_, i) => i !== index));
  };

  // Handle caption change
  const storyHandleCaptionChange = (caption: string) => setStoryNewCaption(caption);

  // Handle privacy change
  const storyHandlePrivacyChange = (p: StoryPrivacyOption) => setStoryPrivacy(p);

  // Submit new story (with media upload)
  const storyHandleCreateStory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUser = session?.user;
    if (!supabaseUser) {
      setStoryFeedback('Not authenticated. Please log in again.');
      setTimeout(() => setStoryFeedback(undefined), 3000);
      return;
    }
    if (storyNewMedia.length === 0) {
      setStoryFeedback('Please select at least one image or video.');
      setTimeout(() => setStoryFeedback(undefined), 3000);
      return;
    }
    setStoryUploading(true);
    setStoryFeedback(undefined);
    try {
      // Upload each media file
      const uploadedMedia = [];
      for (const asset of storyNewMedia) {
        const ext = asset.fileName ? asset.fileName.split('.').pop() : asset.uri.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `stories/${supabaseUser.id}/${fileName}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const publicUrl = await uploadFile(blob, path);
        uploadedMedia.push({ type: asset.type.startsWith('video') ? 'video' : 'image', url: publicUrl });
      }
      // Optimistically add story
      const optimisticStory = {
        id: 'optimistic_' + Date.now(),
        user_id: supabaseUser.id,
        content: uploadedMedia,
        viewers: [],
        privacy: storyPrivacy,
        is_highlight: false,
        highlight_title: null,
        music: null,
        location: null,
        mentions: [],
        hashtags: [],
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        user: {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.username || supabaseUser.email || 'You',
          avatar: supabaseUser.user_metadata?.avatar_url || null,
        },
        isMe: true,
        viewed: true,
      };
      setStories((prev) => [optimisticStory, ...prev]);
      setStoryFeedback('Posting...');
      // Insert story in Supabase
      const { error } = await supabase.from('stories').insert({
        user_id: supabaseUser.id,
        content: uploadedMedia,
        privacy: storyPrivacy,
        is_highlight: false,
        highlight_title: null,
        music: null,
        location: null,
        mentions: [],
        hashtags: [],
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      setStoryFeedback('Story posted!');
      setTimeout(() => setStoryFeedback(undefined), 1200);
      setStoryCreateModalVisible(false);
      setStoryNewMedia([]);
      setStoryNewCaption('');
      setStoryPrivacy('friends');
    } catch (err) {
      setStoryFeedback('Failed to post story. ' + ((err && typeof err === 'object' && 'message' in err) ? (err as any).message : JSON.stringify(err)));
      setTimeout(() => setStoryFeedback(undefined), 4000);
      console.error('Failed to post story:', err);
    } finally {
      setStoryUploading(false);
    }
  };

  // Open story viewer (reset segment)
  const handleViewStory = (story: any) => {
    setCurrentStory(story);
    setStoryIndex(storiesWithAdd.findIndex((s) => s.id === story.id));
    setSegmentIndex(0);
    setViewerVisible(true);
    markStoryAsViewed(story);
    startProgress(0, story);
  };

  // Mark as viewed in Supabase
  const markStoryAsViewed = async (story: any) => {
    if (!story || !user?.id || story.viewed || story.id === 'add') return;
    // Add user.id to viewers array
    const viewers = Array.isArray(story.viewers) ? [...story.viewers, user.id] : [user.id];
    await supabase.from('stories').update({ viewers }).eq('id', story.id);
  };

  // Progress bar animation (per segment)
  const startProgress = (segIdx: number, story: any) => {
    progress.setValue(0);
    const media = story.content && story.content[segIdx];
    let duration = STORY_DURATION;
    if (media && media.type === 'video' && media.duration) {
      duration = media.duration * 1000;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleNextSegment();
    });
  };

  // Next/prev segment logic
  const handleNextSegment = () => {
    if (!currentStory) return;
    const segments = currentStory.content || [];
    if (segmentIndex < segments.length - 1) {
      setSegmentIndex(segmentIndex + 1);
      startProgress(segmentIndex + 1, currentStory);
    } else {
      handleNextStory();
    }
  };
  const handlePrevSegment = () => {
    if (!currentStory) return;
    if (segmentIndex > 0) {
      setSegmentIndex(segmentIndex - 1);
      startProgress(segmentIndex - 1, currentStory);
    } else {
      handlePrevStory();
    }
  };

  // When segmentIndex changes, restart progress
  useEffect(() => {
    if (viewerVisible && currentStory) startProgress(segmentIndex, currentStory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, currentStory]);

  // PanResponder for swipe navigation (segment-aware)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -30) handleNextSegment();
        else if (gestureState.dx > 30) handlePrevSegment();
      },
    })
  ).current;

  // Handle tap/swipe navigation
  const handleNextStory = () => {
    if (storyIndex < storiesWithAdd.length - 1) {
      const next = storiesWithAdd[storyIndex + 1];
      setCurrentStory(next);
      setStoryIndex(storyIndex + 1);
      markStoryAsViewed(next);
      startProgress(0, next); // Reset segment index for next story
    } else {
      setViewerVisible(false);
    }
  };
  const handlePrevStory = () => {
    if (storyIndex > 1) {
      const prev = storiesWithAdd[storyIndex - 1];
      setCurrentStory(prev);
      setStoryIndex(storyIndex - 1);
      markStoryAsViewed(prev);
      startProgress(0, prev); // Reset segment index for previous story
    } else {
      setViewerVisible(false);
    }
  };

  // Viewers list logic
  const openViewersModal = async () => {
    if (!currentStory?.viewers || !currentStory.viewers.length) return setViewersModalVisible(true);
    // Fetch profiles for viewers
    const { data } = await supabase.from('users').select('id, display_name, username, avatar_url').in('id', currentStory.viewers);
    setViewersProfiles(data || []);
    setViewersModalVisible(true);
  };

  // Close modal cleanup
  const handleCloseViewer = () => {
    setViewerVisible(false);
    progress.stopAnimation();
  };

  // Render segmented progress bar
  const renderProgressBar = () => {
    if (!currentStory) return null;
    const segments = currentStory.content || [];
    return (
      <View style={styles.progressBarContainer}>
        {segments.map((_: any, idx: number) => (
          <View key={idx} style={styles.progressBarSegment}>
            {idx === segmentIndex ? (
              <Animated.View style={[styles.progressBar, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
            ) : (
              <View style={[styles.progressBar, { width: idx < segmentIndex ? '100%' : '0%' }]} />
            )}
          </View>
        ))}
      </View>
    );
  };

  // Render story viewer modal (multi-segment, video support, viewers list)
  const renderStoryViewer = () => {
    if (!currentStory || currentStory.id === 'add') return null;
    const segments = currentStory.content || [];
    const media = segments[segmentIndex];
    return (
      <Modal visible={viewerVisible} transparent animationType="fade" onRequestClose={handleCloseViewer}>
        <View style={styles.viewerModal} {...panResponder.panHandlers}>
          {/* Segmented Progress Bar */}
          {renderProgressBar()}
          {/* Story Media */}
          {media && media.type === 'image' && (
            <Animated.Image
              source={{ uri: media.url }}
              style={[styles.viewerImage, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }]}
              resizeMode="cover"
            />
          )}
          {media && media.type === 'video' && (
            <Video
              ref={videoRef}
              source={{ uri: media.url }}
              style={styles.viewerImage}
              resizeMode={ResizeMode.COVER}
              shouldPlay
              isLooping={false}
              onPlaybackStatusUpdate={(status) => {
                if (status && typeof status === 'object' && 'didJustFinish' in status && status.didJustFinish) handleNextSegment();
              }}
            />
          )}
          {/* User Info, Close, Viewers */}
          <View style={styles.viewerHeader}>
            <UserAvatar user={currentStory.user} size={44} style={styles.viewerAvatar} />
            <Text style={[styles.viewerName, { fontSize: 20 }]}>{currentStory.user.name}</Text>
            <Text style={{ color: '#fff', fontSize: 13, marginLeft: 8 }}>{new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <TouchableOpacity onPress={openViewersModal} style={styles.viewersBtn} accessibilityLabel="Viewers">
              <Ionicons name="eye" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCloseViewer} style={styles.closeBtn} accessibilityLabel="Close story viewer">
              <Ionicons name="close" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Tap left/right to navigate segments */}
          <TouchableOpacity style={styles.leftNav} onPress={handlePrevSegment} accessibilityLabel="Previous segment" />
          <TouchableOpacity style={styles.rightNav} onPress={handleNextSegment} accessibilityLabel="Next segment" />
          {/* Viewers List Modal */}
          <Modal visible={viewersModalVisible} transparent animationType="slide" onRequestClose={() => setViewersModalVisible(false)}>
            <View style={styles.viewersModal}>
              <Text style={styles.viewersTitle}>Viewers</Text>
              {viewersProfiles.length === 0 && <Text style={styles.viewersEmpty}>No viewers yet.</Text>}
              {viewersProfiles.map((v) => (
                <View key={v.id} style={styles.viewerRow}>
                  <UserAvatar user={v} size={40} style={styles.viewerAvatar} />
                  <Text style={styles.viewerName}>{v.display_name || v.username}</Text>
                </View>
              ))}
              <TouchableOpacity onPress={() => setViewersModalVisible(false)} style={styles.closeBtn} accessibilityLabel="Close viewers list">
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </Modal>
          {/* TODO: Pause on hold (add touchable without feedback to pause progress) */}
        </View>
      </Modal>
    );
  };

  // Replace handleAddStory to open modal
  const handleAddStory = () => {
    setStoryCreateModalVisible(true);
  };

  // Move renderStoryItem here so it has access to scrollX and pulseAnim
  const renderStoryItem = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.isMe;
    const ringColors = !item.viewed
      ? ['#ff6b6b', '#f7b731', '#4b6cb7', '#182848']
      : ['#ccc', '#eee'];
    // Animation for scale/opacity
    const inputRange = [
      (index - 2) * (ITEM_SIZE + SPACING),
      (index - 1) * (ITEM_SIZE + SPACING),
      index * (ITEM_SIZE + SPACING),
      (index + 1) * (ITEM_SIZE + SPACING),
      (index + 2) * (ITEM_SIZE + SPACING),
    ];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.92, 0.97, 1.12, 0.97, 0.92],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 0.8, 1, 0.8, 0.6],
      extrapolate: 'clamp',
    });
    // Pulse for Add Story
    const animatedStyle = isMe
      ? { transform: [{ scale: pulseAnim }], shadowOpacity: 0.5, shadowRadius: 8 }
      : { transform: [{ scale }], opacity, shadowOpacity: 0.3, shadowRadius: 6 };
    return (
      <Animated.View style={[styles.storyItem, animatedStyle]} key={item.id}>
        <TouchableOpacity
          onPress={() => (isMe ? handleAddStory() : handleViewStory(item))}
          style={{ borderRadius: 32, overflow: 'visible', minWidth: 70, minHeight: 90 }}
          accessibilityLabel={isMe ? 'Add Story' : `${item.user.name}'s story`}
          accessibilityRole="button"
          activeOpacity={0.8}
        >
          {!item.viewed ? (
            <LinearGradient colors={ringColors as [string, string, ...string[]]} style={styles.avatarRing} start={[0, 0]} end={[1, 1]}>
              <UserAvatar user={item.user} size={54} style={styles.avatar} />
              {isMe && (
                <View style={styles.addIcon}>
                  <Ionicons name="add" size={18} color="#fff" />
                </View>
              )}
            </LinearGradient>
          ) : (
            <View style={[styles.avatarRing, { borderColor: ringColors[0], backgroundColor: '#fff', opacity: 0.7 }]}> 
              <UserAvatar user={item.user} size={54} style={styles.avatar} />
              {isMe && (
                <View style={styles.addIcon}>
                  <Ionicons name="add" size={18} color="#fff" />
                </View>
              )}
            </View>
          )}
          <Text style={styles.storyName} numberOfLines={1}>{item.user.name}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.storiesCarousel}>
      <Animated.FlatList
        data={storiesWithAdd}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderStoryItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        snapToInterval={ITEM_SIZE + SPACING}
        decelerationRate={0.95}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
      {renderStoryViewer()}
      {/* Story Creation Modal (new) */}
      <StoryCreateModal
        visible={storyCreateModalVisible}
        onClose={() => setStoryCreateModalVisible(false)}
        onPickMedia={storyPickMedia}
        onLaunchCamera={storyLaunchCamera}
        onRemoveMedia={storyRemoveMedia}
        onChangeCaption={storyHandleCaptionChange}
        onChangePrivacy={storyHandlePrivacyChange}
        onSubmit={storyHandleCreateStory}
        uploading={storyUploading}
        media={storyNewMedia}
        caption={storyNewCaption}
        privacy={storyPrivacy}
        feedback={storyFeedback}
      />
    </View>
  );
};

const PostsScreen = () => {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newMedia, setNewMedia] = useState<MediaAsset[]>([]);
  const [newCaption, setNewCaption] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyOption>('friends');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>(undefined);
  // New state for likes/comments/shares
  const [likes, setLikes] = useState<{ [postId: string]: any[] }>({});
  const [comments, setComments] = useState<{ [postId: string]: any[] }>({});
  const [shares, setShares] = useState<{ [postId: string]: any[] }>({});
  const [commentModal, setCommentModal] = useState<{ visible: boolean; postId?: string }>({ visible: false });
  const [shareModal, setShareModal] = useState<{ visible: boolean; postId?: string }>({ visible: false });
  const [commentInput, setCommentInput] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [likeLoading, setLikeLoading] = useState<{ [postId: string]: boolean }>({});
  const [shareFeedback, setShareFeedback] = useState('');
  const [saved, setSaved] = useState<{ [postId: string]: boolean }>({});
  const [pinned, setPinned] = useState<{ [postId: string]: boolean }>({});
  const [reactions, setReactions] = useState<{ [postId: string]: any[] }>({});
  const [translations, setTranslations] = useState<{ [postId: string]: string | null }>({});
  const [refreshing, setRefreshing] = useState(false);

  // Defensive: always arrays
  const safeArr = (arr: any) => Array.isArray(arr) ? arr : [];

  // Fetch posts from Supabase
  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, user:users(id, display_name, username, avatar_url)')
      .order('created_at', { ascending: false });
    if (!error && data) setPosts(data);
  }, []);

  // Fetch likes/comments/shares for all posts
  const fetchAllPostMeta = useCallback(async (postsList: any[]) => {
    const likeMap: any = {};
    const commentMap: any = {};
    const shareMap: any = {};
    await Promise.all(postsList.map(async (post) => {
      likeMap[post.id] = await fetchPostLikes(post.id);
      commentMap[post.id] = await fetchPostComments(post.id);
      shareMap[post.id] = await fetchPostShares(post.id);
    }));
    setLikes(likeMap);
    setComments(commentMap);
    setShares(shareMap);
  }, []);

  // Real-time subscription for posts
  useEffect(() => {
    fetchPosts();
    const channel = supabase
      .channel('posts:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        fetchPosts();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchPosts]);

  // Fetch meta when posts change
  useEffect(() => {
    if (posts.length > 0) fetchAllPostMeta(posts);
  }, [posts, fetchAllPostMeta]);

  // Real-time subscriptions for likes/comments/shares
  useEffect(() => {
    const likeSubs: any[] = [];
    const commentSubs: any[] = [];
    const shareSubs: any[] = [];
    posts.forEach(post => {
      likeSubs.push(subscribeToPostLikes(post.id, () => fetchPostLikes(post.id).then(l => setLikes(likes => ({ ...likes, [post.id]: l })))));
      commentSubs.push(subscribeToPostComments(post.id, () => fetchPostComments(post.id).then(c => setComments(comments => ({ ...comments, [post.id]: c })))));
      shareSubs.push(subscribeToPostShares(post.id, () => fetchPostShares(post.id).then(s => setShares(shares => ({ ...shares, [post.id]: s })))));
    });
    return () => {
      likeSubs.forEach(sub => sub.unsubscribe && sub.unsubscribe());
      commentSubs.forEach(sub => sub.unsubscribe && sub.unsubscribe());
      shareSubs.forEach(sub => sub.unsubscribe && sub.unsubscribe());
    };
  }, [posts]);

  // Subscribe to saved posts
  useEffect(() => {
    if (!user) return;
    const sub = subscribeToSavedPosts(user.id, () => fetchSavedStates());
    return () => { sub.unsubscribe && sub.unsubscribe(); };
  }, [user]);
  const fetchSavedStates = useCallback(async () => {
    if (!user) return;
    const savedPosts = await fetchSavedPosts(user.id);
    const map: any = {};
    savedPosts.forEach((p: any) => { map[p.id] = true; });
    setSaved(map);
  }, [user]);

  // Subscribe to reactions
  useEffect(() => {
    const subs: any[] = [];
    posts.forEach(post => {
      subs.push(subscribeToPostReactions(post.id, () => fetchReactions(post.id)));
    });
    return () => { subs.forEach(sub => sub.unsubscribe && sub.unsubscribe()); };
  }, [posts]);
  const fetchReactions = useCallback(async (postId: string) => {
    const r = await fetchPostReactions(postId);
    setReactions(reactions => ({ ...reactions, [postId]: r }));
  }, []);

  // Fetch translations
  const fetchTranslation = async (postId: string, lang: string) => {
    const t = await fetchPostTranslation(postId, lang);
    setTranslations(translations => ({ ...translations, [postId]: t }));
  };

  // Like/unlike logic with checks
  const handleLike = async (postId: string) => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to like posts.');
      return;
    }
    if (likeLoading[postId]) return;
    setLikeLoading(l => ({ ...l, [postId]: true }));
    try {
      const userLiked = safeArr(likes[postId]).some((l: any) => l.user_id === user.id);
      if (userLiked) {
        await unlikePost(postId, user.id);
      } else {
        await likePost(postId, user.id);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update like.');
    } finally {
      setLikeLoading(l => ({ ...l, [postId]: false }));
    }
  };

  // Add comment logic with checks
  const handleAddComment = async () => {
    if (!user) {
      Alert.alert('Login required', 'Please log in to comment.');
      return;
    }
    if (!commentModal.postId || !commentInput.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      await addPostComment(commentModal.postId, user.id, commentInput.trim());
      setCommentInput('');
    } catch (e) {
      Alert.alert('Error', 'Failed to add comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  // Delete comment logic with checks
  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;
    try {
      await deletePostComment(commentId, user.id);
    } catch (e) {
      Alert.alert('Error', 'Failed to delete comment.');
    }
  };

  // Share logic with feedback and duplicate prevention
  const handleShare = async () => {
    if (!user || !shareModal.postId || shareLoading) return;
    setShareLoading(true);
    try {
      const alreadyShared = safeArr(shares[shareModal.postId]).some((s: any) => s.user_id === user.id);
      if (!alreadyShared) {
        await sharePost(shareModal.postId, user.id);
      }
      // Copy link
      const link = `${window.location.origin}/post/${shareModal.postId}`;
      if (navigator.clipboard) await navigator.clipboard.writeText(link);
      setShareFeedback('Link copied!');
      if (Platform.OS === 'android') ToastAndroid.show('Link copied!', ToastAndroid.SHORT);
    } catch (e) {
      Alert.alert('Error', 'Failed to share post.');
    } finally {
      setShareLoading(false);
      setTimeout(() => setShareFeedback(''), 1500);
      setShareModal({ visible: false });
    }
  };

  // Save/Unsave
  const handleSave = async (postId: string) => {
    if (!user) return;
    if (saved[postId]) {
      await unsavePost(postId, user.id);
    } else {
      await savePost(postId, user.id);
    }
    fetchSavedStates();
  };

  // Pin/Unpin
  const handlePin = async (postId: string, isPinned: boolean) => {
    if (!user) return;
    if (isPinned) {
      await unpinPost(postId, user.id);
    } else {
      await pinPost(postId, user.id);
    }
    fetchPosts();
  };

  // Quick Reactions
  const handleReact = async (postId: string, emoji: string) => {
    if (!user) return;
    const userReacted = reactions[postId]?.find((r: any) => r.emoji === emoji && r.users.includes(user.id));
    if (userReacted) {
      await unreactToPost(postId, user.id, emoji);
    } else {
      await reactToPost(postId, user.id, emoji);
    }
    fetchReactions(postId);
  };

  // Report
  const handleReport = async (postId: string, reason: string) => {
    if (!user) return;
    await reportPost(postId, user.id, reason);
    Alert.alert('Reported', 'Thank you for reporting this post.');
  };

  // Translation
  const handleTranslate = async (postId: string, lang: string) => {
    // For demo, just fake translation
    const fakeTranslation = 'This is a translated caption.';
    await updatePostTranslation(postId, lang, fakeTranslation);
    setTranslations(translations => ({ ...translations, [postId]: fakeTranslation }));
  };

  // Pick from gallery
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets) {
      // Map ImagePickerAsset to MediaAsset
      setNewMedia([
        ...newMedia,
        ...result.assets.map((a) => ({
          uri: a.uri,
          type: a.type || 'image',
          fileName: a.fileName || undefined,
        })),
      ]);
    }
  };

  // Launch camera
  const launchCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets) {
      setNewMedia([
        ...newMedia,
        ...result.assets.map((a) => ({
          uri: a.uri,
          type: a.type || 'image',
          fileName: a.fileName || undefined,
        })),
      ]);
    }
  };

  // Remove media
  const removeMedia = (index: number) => {
    setNewMedia(newMedia.filter((_, i) => i !== index));
  };

  // Handle caption change
  const handleCaptionChange = (caption: string) => setNewCaption(caption);

  // Handle privacy change
  const handlePrivacyChange = (p: PrivacyOption) => setPrivacy(p);

  // Submit new post (with media upload)
  const handleCreatePost = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUser = session?.user;
    if (!supabaseUser) {
      setFeedback('Not authenticated. Please log in again.');
      setTimeout(() => setFeedback(undefined), 3000);
      return;
    }
    if (newMedia.length === 0) {
      setFeedback('Please select at least one image or video.');
      setTimeout(() => setFeedback(undefined), 3000);
      return;
    }
    setUploading(true);
    setFeedback(undefined);
    try {
      // Upload each media file
      const uploadedMedia = [];
      for (const asset of newMedia) {
        const ext = asset.fileName ? asset.fileName.split('.').pop() : asset.uri.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `posts/${supabaseUser.id}/${fileName}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const publicUrl = await uploadFile(blob, path);
        uploadedMedia.push({ type: asset.type.startsWith('video') ? 'video' : 'image', url: publicUrl });
      }
      // Insert post
      const { error } = await supabase.from('posts').insert({
        user_id: supabaseUser.id,
        media: uploadedMedia,
        caption: newCaption,
        privacy,
      });
      if (error) throw error;
      setFeedback('Post created!');
      setTimeout(() => setFeedback(undefined), 1200);
      setCreateModalVisible(false);
      setNewMedia([]);
      setNewCaption('');
      setPrivacy('friends');
    } catch (err) {
      setFeedback('Failed to create post. ' + ((err && typeof err === 'object' && 'message' in err) ? (err as any).message : JSON.stringify(err)));
      setTimeout(() => setFeedback(undefined), 4000);
      console.error('Create post error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  // Infinite scroll (for demo, just fetch more)
  const onEndReached = async () => {
    // TODO: implement pagination
  };

  // Render post
  const renderPost = ({ item }: { item: any }) => {
    return (
      <PostCard
        post={item}
        user={item.user}
        analytics={{ likes: safeArr(likes[item.id]).length, comments: safeArr(comments[item.id]).length, shares: safeArr(shares[item.id]).length }}
        onLike={() => handleLike(item.id)}
        onComment={() => setCommentModal({ visible: true, postId: item.id })}
        onShare={() => setShareModal({ visible: true, postId: item.id })}
        onSave={() => handleSave(item.id)}
        onPin={() => handlePin(item.id, !!item.is_pinned)}
        onMore={() => {}}
        onPressTag={(tag: string) => { /* navigate to tag screen */ }}
        onPressMention={(mention: string) => { /* navigate to user profile */ }}
        onTranslate={() => handleTranslate(item.id, 'en')}
        isPinned={!!item.is_pinned}
        isSaved={!!saved[item.id]}
        isLiked={!!(user && safeArr(likes[item.id]).some((l: any) => l.user_id === user.id))}
        isOwnPost={user && item.user?.id === user.id}
        reactions={reactions[item.id] || []}
        onReact={(emoji: string) => handleReact(item.id, emoji)}
        currentUserId={user?.id || ''}
        onEdit={() => {}}
        onDelete={() => {}}
        onReport={() => handleReport(item.id, 'Inappropriate content')}
        onMute={() => {}}
        onFollow={() => {}}
        onBlock={() => {}}
        onAddToStory={() => {}}
        showTranslation={!!translations[item.id]}
        translation={translations[item.id]}
      />
    );
  };

  // 3. Sort posts so pinned posts appear at the top
  const sortedPosts = [...posts].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  // Comment Modal
  const renderCommentModal = () => {
    const postId = commentModal.postId;
    const postComments = postId ? comments[postId] || [] : [];
    return (
      <Modal visible={commentModal.visible} transparent animationType="slide" onRequestClose={() => setCommentModal({ visible: false })}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 400, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Comments</Text>
            <FlatList
              data={postComments}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <UserAvatar user={item.user} size={28} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#222' }}>{item.user?.display_name || item.user?.username || 'User'}</Text>
                    <Text style={{ color: '#444' }}>{item.content}</Text>
                  </View>
                  {user && item.user_id === user.id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={{ marginLeft: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No comments yet.</Text>}
              style={{ maxHeight: 220 }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: '#f2f2f2', borderRadius: 8, padding: 10, fontSize: 15 }}
                placeholder="Add a comment..."
                value={commentInput || ''}
                onChangeText={setCommentInput}
                editable={!commentLoading}
                maxLength={300}
              />
              <TouchableOpacity onPress={handleAddComment} disabled={commentLoading || !commentInput.trim()} style={{ marginLeft: 8 }}>
                <Ionicons name="send" size={22} color={commentLoading || !commentInput.trim() ? '#ccc' : '#007AFF'} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ position: 'absolute', top: 10, right: 10 }} onPress={() => setCommentModal({ visible: false })}>
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Share Modal
  const renderShareModal = () => {
    const postId = shareModal.postId;
    const shareCount = postId ? safeArr(shares[postId]).length : 0;
    return (
      <Modal visible={shareModal.visible} transparent animationType="slide" onRequestClose={() => setShareModal({ visible: false })}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 340, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Share Post</Text>
            <Text style={{ color: '#888', marginBottom: 16 }}>Shared {shareCount} times</Text>
            <TouchableOpacity onPress={handleShare} disabled={shareLoading} style={{ backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 16, width: '100%' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>{shareLoading ? 'Sharing...' : 'Copy Link & Share'}</Text>
            </TouchableOpacity>
            {shareFeedback ? <Text style={{ color: '#007AFF', marginBottom: 8 }}>{shareFeedback}</Text> : null}
            {/* Scaffold for share to chat */}
            <TouchableOpacity disabled style={{ backgroundColor: '#eee', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, width: '100%' }}>
              <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center' }}>Share to Chat (coming soon)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ position: 'absolute', top: 10, right: 10 }} onPress={() => setShareModal({ visible: false })}>
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Stories Carousel */}
        <View style={styles.storiesContainer}>
          <StoriesCarousel />
        </View>
        {/* Posts Feed */}
        <View style={styles.feedContainer}>
          <FlatList
            data={sortedPosts}
            renderItem={renderPost}
            keyExtractor={(item: any) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            style={styles.postsFeed}
            ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No posts yet.</Text>}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
          />
          {/* Floating Action Button for New Post */}
          <TouchableOpacity style={styles.fab} onPress={() => setCreateModalVisible(true)}>
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
          {/* Post Creation Modal (new) */}
          <PostCreateModal
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onPickMedia={pickMedia}
            onLaunchCamera={launchCamera}
            onRemoveMedia={removeMedia}
            onChangeCaption={handleCaptionChange}
            onChangePrivacy={handlePrivacyChange}
            onSubmit={handleCreatePost}
            uploading={uploading}
            media={newMedia}
            caption={newCaption}
            privacy={privacy}
            feedback={feedback}
          />
          {/* Comments Modal */}
          {renderCommentModal()}
          {/* Share Modal */}
          {renderShareModal()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#fff',
  },
  storiesContainer: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 2,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
    zIndex: 1,
  },
  storiesCarousel: { height: 120, justifyContent: 'center', borderBottomWidth: 1, borderColor: '#eee', paddingTop: 8 },
  postsFeed: { flex: 1, padding: 0, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginVertical: 12 },
  fab: { position: 'absolute', right: 24, bottom: 32, backgroundColor: '#007AFF', borderRadius: 32, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  storyItem: { alignItems: 'center', marginRight: SPACING, width: ITEM_SIZE },
  avatarRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 6, backgroundColor: '#fff', shadowOpacity: 0.3, shadowRadius: 6 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  addIcon: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#007AFF', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  storyName: { fontSize: 12, color: '#333', textAlign: 'center', width: ITEM_SIZE },
  viewerModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 40, right: 30, zIndex: 10 },
  progressBarContainer: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', zIndex: 10, flexDirection: 'row' },
  progressBarSegment: { flex: 1, marginHorizontal: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: 4, backgroundColor: '#fff', borderRadius: 2 },
  viewerImage: { width: width * 0.9, height: width * 1.3, borderRadius: 20, marginTop: 40, marginBottom: 20 },
  viewerHeader: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  viewerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  viewerName: { color: '#fff', fontWeight: 'bold', fontSize: 18, marginRight: 16 },
  leftNav: { position: 'absolute', left: 0, top: 0, bottom: 0, width: width / 2, zIndex: 1 },
  rightNav: { position: 'absolute', right: 0, top: 0, bottom: 0, width: width / 2, zIndex: 1 },
  viewersBtn: { marginLeft: 8 },
  viewersModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  viewersTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  viewersEmpty: { color: '#aaa', fontSize: 16, marginBottom: 16 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postCard: { backgroundColor: '#fff', borderRadius: 16, margin: 16, marginBottom: 8, padding: 0, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  postName: { fontWeight: 'bold', color: '#222', fontSize: 16, marginRight: 8 },
  postTime: { color: '#888', fontSize: 12, marginLeft: 'auto' },
  postMedia: { width: '100%', height: 320, backgroundColor: '#eee', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  postCaption: { padding: 12, fontSize: 15, color: '#222' },
  createModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  createTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  mediaPicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f2f2f2', borderRadius: 8, padding: 12, marginBottom: 16 },
  mediaPickerText: { color: '#007AFF', fontSize: 16, marginLeft: 10 },
  captionInput: { backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 80, width: width * 0.8, marginBottom: 16 },
  createBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 16 },
  createBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});

export default PostsScreen; 