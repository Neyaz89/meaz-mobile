import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Modal, PanResponder, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import UserAvatar from '../components/UserAvatar';
import {
    supabase
} from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
// 1. Import new components
import { LinearGradient } from 'expo-linear-gradient';
import PostCreateModal from '../components/post/PostCreateModal';
import PostCard from '../components/PostCard';
import StoryCreateModal, { PrivacyOption as StoryPrivacyOption } from '../components/stories/StoryCreateModal';
import { MediaAsset as PostMediaAsset, usePostsStore } from '../store/postsStore';
import { useStoriesStore } from '../store/storiesStore';

const { width } = Dimensions.get('window');
const ITEM_SIZE = 70;
const SPACING = 16;
const STORY_DURATION = 5000; // ms per story segment

const StoriesCarousel = () => {
  const { user } = useAuthStore();
  const {
    stories,
    myStories,
    isLoading: storiesLoading,
    error: storiesError,
    createStory,
    subscribeToStories,
    loadMyStories,
    loadFriendsStories,
  } = useStoriesStore();
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
  // Story creation modal state
  const [storyCreateModalVisible, setStoryCreateModalVisible] = useState(false);
  const [storyNewMedia, setStoryNewMedia] = useState<PostMediaAsset[]>([]);
  const [storyNewCaption, setStoryNewCaption] = useState('');
  const [storyPrivacy, setStoryPrivacy] = useState<StoryPrivacyOption>('friends');
  const [storyUploading, setStoryUploading] = useState(false);
  const [storyFeedback, setStoryFeedback] = useState<string | undefined>(undefined);

  // Subscribe to real-time stories
  useEffect(() => {
    loadMyStories();
    loadFriendsStories();
    const channel = subscribeToStories();
    return () => { channel.unsubscribe && channel.unsubscribe(); };
  }, [subscribeToStories, loadMyStories, loadFriendsStories]);

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
    ...[...myStories, ...stories].map((story) => ({
      ...story,
      user: {
        id: story.user?.id,
        name: story.user?.display_name || story.user?.username || 'User',
        avatar: story.user?.avatar_url || null,
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
    if (!user) {
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
      await createStory(
        storyNewMedia,
        storyPrivacy,
        {
          // Add more options if needed
        }
      );
      setStoryFeedback('Story posted!');
      setTimeout(() => setStoryFeedback(undefined), 1200);
      setStoryCreateModalVisible(false);
      setStoryNewMedia([]);
      setStoryNewCaption('');
      setStoryPrivacy('friends');
    } catch (err) {
      setStoryFeedback('Failed to post story.');
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
  const {
    posts,
    isLoading: postsLoading,
    error: postsError,
    fetchPosts,
    subscribeToPosts,
    createPost,
  } = usePostsStore();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newMedia, setNewMedia] = useState<PostMediaAsset[]>([]);
  const [newCaption, setNewCaption] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyOption>('friends');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | undefined>(undefined);

  // Subscribe to real-time posts
  useEffect(() => {
    fetchPosts();
    const channel = subscribeToPosts();
    return () => { channel.unsubscribe && channel.unsubscribe(); };
  }, [subscribeToPosts, fetchPosts]);

  // Pick from gallery
  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
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
    if (!user) {
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
      await createPost(newMedia, newCaption, privacy);
      setFeedback('Post created!');
      setTimeout(() => setFeedback(undefined), 1200);
      setCreateModalVisible(false);
      setNewMedia([]);
      setNewCaption('');
      setPrivacy('friends');
    } catch (err) {
      setFeedback('Failed to create post.');
      setTimeout(() => setFeedback(undefined), 4000);
      console.error('Create post error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Render post
  const renderPost = ({ item }: { item: any }) => {
    return (
      <PostCard
        post={item}
        user={item.user}
        // ... pass other props as needed ...
      />
    );
  };

  // Sort posts so pinned posts appear at the top
  const sortedPosts = [...posts].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

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
            refreshing={postsLoading}
            onRefresh={fetchPosts}
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