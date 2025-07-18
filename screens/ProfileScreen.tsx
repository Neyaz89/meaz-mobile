import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useToast } from '../components/ui/Toast';
import { addPostComment, deletePostComment, fetchFollowers, fetchFollowing, fetchPostComments, fetchPostLikes, fetchSavedPosts, fetchTaggedPosts, fetchUserPosts, fetchUserProfile, followUser, isBlocked, likePost, supabase, unfollowUser, unlikePost, updatePostComment, updateUserProfile, uploadFile } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

const TABS = [
  { key: 'posts', label: 'Posts', icon: 'grid-outline' },
  { key: 'reels', label: 'Reels', icon: 'film-outline' },
  { key: 'tagged', label: 'Tagged', icon: 'pricetag-outline' },
  { key: 'saved', label: 'Saved', icon: 'bookmark-outline' },
];

const { width } = Dimensions.get('window');
const GRID_SIZE = 3;
const THUMB_SIZE = width / GRID_SIZE - 4;

export default function ProfileScreen() {
  const route = useRoute<any>();
  const { user: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  // Debug: Log navigation params and currentUser
  console.log('[ProfileScreen] route.params:', route.params);
  console.log('[ProfileScreen] currentUser:', currentUser);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [avatarModal, setAvatarModal] = useState(false);
  const toast = useToast();
  const [shareModal, setShareModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [postDetails, setPostDetails] = useState<any>(null);
  const [editProfile, setEditProfile] = useState({ display_name: '', bio: '', status: '', avatar_url: '', is_private: false });
  const navigation = useNavigation();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [likes, setLikes] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [customizerModal, setCustomizerModal] = useState(false);
  const [privacySettings, setPrivacySettings] = useState(profile?.privacy_settings || {});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const { friends: allFriends, loadFriends } = useFriendsStore();
  // 1. Add state for full friend objects
  const [profileFriends, setProfileFriends] = useState<any[]>([]);
  const [friendsModal, setFriendsModal] = useState(false);
  const { signOut } = useAuthStore();
  const [settingsModal, setSettingsModal] = useState(false);

  // Determine whose profile to show
  const paramUserId = route.params?.userId || route.params?.username || currentUser?.id;
  const [profileUserIdOrUsername, setProfileUserIdOrUsername] = useState(paramUserId);
  // Debug: Log which userId/username is being used
  useEffect(() => {
    console.log('[ProfileScreen] setProfileUserIdOrUsername:', route.params?.userId, route.params?.username, currentUser?.id);
    setProfileUserIdOrUsername(route.params?.userId || route.params?.username || currentUser?.id);
  }, [route.params, currentUser?.id]);

  // Fetch profile and stats
  useEffect(() => {
    let mounted = true;
      setLoading(true);
    (async () => {
      console.log('[ProfileScreen] Fetching profile for:', profileUserIdOrUsername);
      if (!currentUser || !currentUser.id) {
        setProfile(null);
        setLoading(false);
        console.log('[ProfileScreen] Not logged in');
        toast.error('Not logged in.');
        return;
      }
      try {
        let prof = null;
        let canView = true;
        try {
          prof = await fetchUserProfile(profileUserIdOrUsername);
          console.log('[ProfileScreen] fetchUserProfile result:', prof);
        } catch (e: any) {
          console.error('[ProfileScreen] fetchUserProfile error:', e);
          // If fetching your own profile and it doesn't exist, auto-create
          if (profileUserIdOrUsername === currentUser.id) {
            try {
              await supabase.from('users').insert({
                id: currentUser.id,
                email: currentUser.email || '',
                username: currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : `user_${currentUser.id.slice(0, 8)}`),
                display_name: currentUser.displayName || currentUser.username || (currentUser.email ? currentUser.email.split('@')[0] : 'New User'),
                avatar_url: currentUser.avatar || '',
                bio: currentUser.bio || '',
                status: currentUser.status || 'online',
              });
              prof = await fetchUserProfile(currentUser.id);
              console.log('[ProfileScreen] Auto-created profile:', prof);
            } catch (insertErr: any) {
              console.error('[ProfileScreen] Profile auto-insert error:', insertErr);
              toast.error('Failed to auto-create profile: ' + (insertErr?.message || insertErr));
              setProfile(null);
              setLoading(false);
              return;
            }
        } else {
            toast.error('Failed to load profile: ' + (e?.message || e));
            setProfile(null);
            setLoading(false);
            return;
          }
        }
        // Privacy logic
        if (profileUserIdOrUsername !== currentUser.id && currentUser && prof && prof.id !== currentUser.id) {
          if (prof.is_private) {
            const { data: friends, error: friendsError } = await supabase
              .from('friends')
              .select('*')
              .or(`and(user_id.eq.${currentUser.id},friend_id.eq.${prof.id}),and(user_id.eq.${prof.id},friend_id.eq.${currentUser.id})`)
              .eq('status', 'accepted');
            if (friendsError) throw friendsError;
            canView = friends && friends.length > 0;
            console.log('[ProfileScreen] Privacy check, canView:', canView, 'friends:', friends);
          }
        }
        if (!mounted) return;
        setProfile(canView ? prof : null);
        setIsOwner(prof.id === currentUser.id);
        setBlocked(currentUser && prof.id !== currentUser.id ? await isBlocked(currentUser.id, prof.id) : false);
        const [f, g] = await Promise.all([
          fetchFollowers(prof.id),
          fetchFollowing(prof.id),
        ]);
        setFollowers(f || []);
        setFollowing(g || []);
        if (currentUser && prof.id !== currentUser.id) {
          setIsFollowing(!!f.find((x: any) => x.follower_id === currentUser.id));
        }
      } catch (e: any) {
        console.error('[ProfileScreen] Profile load error:', e);
        setProfile(null);
        toast.error('Failed to load profile: ' + (e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [profileUserIdOrUsername, currentUser]);

  useEffect(() => {
    if (profile && isOwner) {
      setEditProfile({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        status: profile.status || '',
        avatar_url: profile.avatar_url || '',
        is_private: profile.is_private || false,
      });
    }
  }, [profile, isOwner]);

  // Fetch posts for current tab
  const fetchTabPosts = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      let data = [];
      if (tab === 'posts') data = await fetchUserPosts(profile.id);
      else if (tab === 'tagged') data = await fetchTaggedPosts(profile.id);
      else if (tab === 'saved' && isOwner) data = await fetchSavedPosts(profile.id);
      // TODO: Reels logic (vertical video feed)
      setPosts(data || []);
    } catch (e) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [tab, profile, isOwner]);

  useEffect(() => { fetchTabPosts(); }, [tab, fetchTabPosts]);

  // Fetch Reels (video posts)
  const fetchReels = useCallback(async () => {
    if (!profile) return [];
    const allPosts = await fetchUserPosts(profile.id);
    return allPosts.filter((p: any) => p.media && p.media[0]?.type === 'video');
  }, [profile]);
  const [reels, setReels] = useState<any[]>([]);
  useEffect(() => {
    if (tab === 'reels') {
      fetchReels().then(setReels);
    }
  }, [tab, fetchReels]);

  // Follow/unfollow
  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    await followUser(currentUser.id, profile.id);
    setIsFollowing(true);
    setFollowers((prev) => [...prev, { follower_id: currentUser.id }]);
  };
  const handleUnfollow = async () => {
    if (!currentUser || !profile) return;
    await unfollowUser(currentUser.id, profile.id);
    setIsFollowing(false);
    setFollowers((prev) => prev.filter((f) => f.follower_id !== currentUser.id));
  };

  // Share profile link logic
  const profileLink = profile ? `https://meaz.app/user/${profile.username}` : '';
  const handleCopyLink = () => {
    if (!profile) return;
    Clipboard.setStringAsync(profileLink);
    toast.success('Profile link copied!');
  };

  // Edit profile logic
  const handleSaveProfile = async () => {
    try {
      // Only include fields that exist in the type
      const updateFields: any = {
        display_name: editProfile.display_name,
        bio: editProfile.bio,
        status: editProfile.status as any,
        avatar_url: editProfile.avatar_url,
      };
      // If your users table has is_private, include it; otherwise, remove this line
      if ('is_private' in profile) updateFields.is_private = editProfile.is_private;
      await updateUserProfile(profile.id, updateFields);
      toast.success('Profile updated!');
      setEditModal(false);
    } catch (e) {
      toast.error('Failed to update profile.');
    }
  };

  // Avatar upload logic
  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUploading(true);
      try {
        const asset = result.assets[0];
        const ext = asset.uri.split('.').pop();
        const fileName = `avatars/${profile.id}_${Date.now()}.${ext}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const publicUrl = await uploadFile(blob, fileName);
        setEditProfile((p) => ({ ...p, avatar_url: publicUrl }));
        toast.success('Avatar updated!');
      } catch (e) {
        toast.error('Failed to upload avatar.');
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  // Message/Call logic
  const handleMessage = async () => {
    if (!currentUser || !profile) return;
    try {
      const { data, error } = await supabase.rpc('start_or_get_chat', { user_a: currentUser.id, user_b: profile.id });
      if (error) throw error;
      (navigation as any).navigate('ChatDetailScreen', { chatId: data });
    } catch (e) {
      toast.error('Failed to start chat.');
    }
  };
  const handleCall = async () => {
    if (!currentUser || !profile) return;
    try {
      const { data, error } = await supabase.rpc('start_call', { caller: currentUser.id, receiver: profile.id, call_type: 'audio' });
      if (error) throw error;
      (navigation as any).navigate('CallInterface', { callId: data });
    } catch (e) {
      toast.error('Failed to start call.');
    }
  };

  // Post details logic (likes/comments)
  useEffect(() => {
    if (postDetails && currentUser) {
      fetchPostLikes(postDetails.id).then(setLikes).catch(() => setLikes([]));
      fetchPostComments(postDetails.id).then(setComments).catch(() => setComments([]));
      setLiked(!!likes.find((l) => l.user_id === currentUser.id));
    }
  }, [postDetails]);

  const handleLike = async () => {
    if (!postDetails || !currentUser) return;
    try {
      if (liked) {
        await unlikePost(postDetails.id, currentUser.id);
        setLiked(false);
        setLikes((prev) => prev.filter((l) => l.user_id !== currentUser.id));
      } else {
        await likePost(postDetails.id, currentUser.id);
        setLiked(true);
        setLikes((prev) => [...prev, { user_id: currentUser.id, user: currentUser }]);
      }
    } catch (e) {
      toast.error('Failed to update like.');
    }
  };
  const handleAddComment = async () => {
    if (!postDetails || !currentUser || !commentText.trim()) return;
    try {
      await addPostComment(postDetails.id, currentUser.id, commentText.trim());
      setComments((prev) => [...prev, { user_id: currentUser.id, content: commentText.trim(), user: currentUser }]);
      setCommentText('');
    } catch (e) {
      toast.error('Failed to add comment.');
    }
  };

  const handleEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };
  const handleSaveEditComment = async () => {
    if (!editingCommentId || !editingCommentText.trim()) return;
    try {
      await updatePostComment(editingCommentId, editingCommentText.trim());
      setComments(prev => prev.map(c => c.id === editingCommentId ? { ...c, content: editingCommentText.trim() } : c));
      setEditingCommentId(null);
      setEditingCommentText('');
      toast.success('Comment updated');
    } catch (e) {
      toast.error('Failed to update comment');
    }
  };
  const handleDeleteComment = async (comment: any) => {
    if (!currentUser) return;
    try {
      await deletePostComment(comment.id, currentUser.id);
      setComments(prev => prev.filter(c => c.id !== comment.id));
      toast.success('Comment deleted');
    } catch (e) {
      toast.error('Failed to delete comment');
    }
  };

  // 2. Fetch full friend user objects for the profile being viewed
  useEffect(() => {
    async function fetchProfileFriends() {
      if (!profile) return setProfileFriends([]);
      // Fetch friends where user is user_id
      const { data: friends1, error: error1 } = await supabase
        .from('friends')
        .select(`
          friend_id,
          users:users!friends_friend_id_fkey (
            id, username, display_name, avatar_url, status, bio
          )
        `)
        .eq('user_id', profile.id);
      // Fetch friends where user is friend_id
      const { data: friends2, error: error2 } = await supabase
        .from('friends')
        .select(`
          user_id,
          users:users!friends_user_id_fkey (
            id, username, display_name, avatar_url, status, bio
          )
        `)
        .eq('friend_id', profile.id);
      console.log('[ProfileScreen] friends1:', friends1, 'error1:', error1);
      console.log('[ProfileScreen] friends2:', friends2, 'error2:', error2);
      if (error1 || error2) {
        setProfileFriends([]);
        return;
      }
      // Map and merge, deduplicate by id
      const formatted1 = (friends1 || []).map((f: any) => f.users).filter(Boolean);
      const formatted2 = (friends2 || []).map((f: any) => f.users).filter(Boolean);
      const all = [...formatted1, ...formatted2].filter((f, i, arr) => arr.findIndex(ff => ff.id === f.id) === i);
      console.log('[ProfileScreen] profileFriends (all):', all);
      setProfileFriends(all);
    }
    fetchProfileFriends();
  }, [profile]);

  // Render post grid item
  const renderPostItem = ({ item }: { item: any }) => {
    const media = item.media && item.media[0];
    return (
      <TouchableOpacity style={styles.gridItem}>
        {media && media.type === 'image' && (
          <Image source={{ uri: media.url }} style={styles.gridThumb} />
        )}
        {media && media.type === 'video' && (
          <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
        )}
        {(!media || media.type === 'text') && (
          <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="document-text-outline" size={32} color="#888" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Post details logic
  const handleOpenPost = (item: any) => setPostDetails(item);
  const handleClosePost = () => setPostDetails(null);

  try {
    if (loading) {
      console.log('[ProfileScreen] UI: loading spinner');
      return <View style={styles.loading}><ActivityIndicator size="large" color="#FF6B35" /></View>;
    }
    if (!currentUser || !currentUser.id) {
      console.log('[ProfileScreen] UI: not logged in');
      return <View style={styles.loading}><Text>Not logged in.</Text></View>;
    }
    if (!profile) {
      console.log('[ProfileScreen] profile is null, showing error UI');
      return (
        <View style={styles.loading}>
          <Text style={{ marginBottom: 12 }}>
            {profileUserIdOrUsername !== currentUser?.id
              ? 'This account is private or not found.'
              : 'Profile not found.'}
          </Text>
          <TouchableOpacity onPress={() => setProfileUserIdOrUsername(currentUser?.id)} style={{ backgroundColor: '#FF6B35', borderRadius: 8, padding: 12 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
    </TouchableOpacity>
        </View>
    );
  }
    console.log('[ProfileScreen] Rendering profile UI for:', profile);
    // FORCE VISIBLE TEST UI + PROFILE HEADER
  return (
      <View style={{ flex: 1 }}>
        {/* Profile Header UI */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          {/* Settings button (owner only) */}
          {isOwner && (
            <TouchableOpacity
              style={{ position: 'absolute', top: 0, right: 20, zIndex: 10 }}
              onPress={() => setSettingsModal(true)}
            >
              <Ionicons name="settings-outline" size={28} color="#FF6B35" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setAvatarModal(true)}>
            <Image
              source={{ uri: profile.avatar_url || 'https://picsum.photos/200/200?random=1' }}
              style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12, backgroundColor: '#eee' }}
            />
          </TouchableOpacity>
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>
            {profile.display_name || profile.username}
          </Text>
          <Text style={{ fontSize: 16, color: '#888', marginBottom: 8 }}>
            @{profile.username}
          </Text>
          {profile.bio ? (
            <Text style={{ fontSize: 15, color: '#444', textAlign: 'center', marginHorizontal: 24 }}>
              {profile.bio}
            </Text>
          ) : null}
        </View>
        {/* Avatar Modal */}
        {avatarModal && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 40 }}>
            <Image source={{ uri: profile.avatar_url || 'https://picsum.photos/200/200?random=1' }} style={{ width: 280, height: 280, borderRadius: 140, backgroundColor: '#eee' }} />
            <TouchableOpacity onPress={() => setAvatarModal(false)} style={{ position: 'absolute', top: 60, right: 30 }}>
              <Ionicons name="close-circle" size={40} color="#FF6B35" />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={handlePickAvatar} style={{ marginTop: 24, backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Change Avatar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {/* Stats Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 18, marginBottom: 4 }}>
          <View style={{ alignItems: 'center', marginHorizontal: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>{posts.length}</Text>
            <Text style={{ fontSize: 13, color: '#888' }}>Posts</Text>
          </View>
          <TouchableOpacity style={{ alignItems: 'center', marginHorizontal: 18 }} onPress={() => setFriendsModal(true)}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>{profileFriends.length}</Text>
            <Text style={{ fontSize: 13, color: '#FF6B35', textDecorationLine: 'underline' }}>Friends</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', marginHorizontal: 18 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>{following.length}</Text>
            <Text style={{ fontSize: 13, color: '#888' }}>Following</Text>
      </View>
        </View>
        {/* Edit Profile Button (owner only) */}
        {isOwner && (
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <TouchableOpacity
              style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24 }}
              onPress={() => setEditModal(true)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Edit Profile</Text>
            </TouchableOpacity>
        </View>
        )}
        {/* Share Profile Button */}
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={{ backgroundColor: '#eee', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center' }}
            onPress={handleCopyLink}
          >
            <Ionicons name="share-social-outline" size={18} color="#FF6B35" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FF6B35', fontWeight: 'bold' }}>Share Profile</Text>
          </TouchableOpacity>
        </View>
        {/* Message/Call Buttons (not owner) */}
        {!isOwner && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, marginRight: 12, flexDirection: 'row', alignItems: 'center' }}
              onPress={handleMessage}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: '#eee', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center' }}
              onPress={handleCall}
            >
              <Ionicons name="call-outline" size={18} color="#FF6B35" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FF6B35', fontWeight: 'bold' }}>Call</Text>
            </TouchableOpacity>
          </View>
        )}
        {/* Edit Profile Modal */}
        {editModal && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Edit Profile</Text>
              <TouchableOpacity onPress={handlePickAvatar} style={{ alignSelf: 'center', marginBottom: 16 }}>
                <Image source={{ uri: editProfile.avatar_url || profile.avatar_url || 'https://picsum.photos/200/200?random=1' }} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#eee' }} />
                <Text style={{ color: '#FF6B35', marginTop: 4, textAlign: 'center' }}>Change Avatar</Text>
              </TouchableOpacity>
              <Text style={{ marginBottom: 4 }}>Display Name</Text>
              <TextInput
                value={editProfile.display_name}
                onChangeText={text => setEditProfile(p => ({ ...p, display_name: text }))}
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginBottom: 12 }}
                placeholder="Display Name"
              />
              <Text style={{ marginBottom: 4 }}>Bio</Text>
              <TextInput
                value={editProfile.bio}
                onChangeText={text => setEditProfile(p => ({ ...p, bio: text }))}
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginBottom: 12 }}
                placeholder="Bio"
                multiline
              />
              <Text style={{ marginBottom: 4 }}>Status</Text>
              <TextInput
                value={editProfile.status}
                onChangeText={text => setEditProfile(p => ({ ...p, status: text }))}
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginBottom: 12 }}
                placeholder="Status"
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                <TouchableOpacity onPress={() => setEditModal(false)} style={{ padding: 10 }}>
                  <Text style={{ color: '#888', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveProfile} style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {/* Friends Modal */}
        {friendsModal && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%', maxHeight: '70%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Friends</Text>
              <View style={{ maxHeight: 300 }}>
                {profileFriends.length === 0 ? (
                  <Text style={{ color: '#888' }}>No friends yet.</Text>
                ) : (
                  profileFriends.map(friend => (
                    <TouchableOpacity
                      key={friend.id}
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                      onPress={() => {
                        setFriendsModal(false);
                        (navigation as any).navigate('ProfileScreen', { userId: friend.id });
                      }}
                    >
                      <Image source={{ uri: friend.avatar_url || 'https://picsum.photos/200/200?random=2' }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#eee' }} />
                      <View>
                        <Text style={{ fontWeight: 'bold' }}>{friend.display_name || friend.username}</Text>
                        <Text style={{ color: '#888' }}>@{friend.username}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
              <TouchableOpacity onPress={() => setFriendsModal(false)} style={{ marginTop: 16, alignSelf: 'center' }}>
                <Text style={{ color: '#FF6B35', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Profile Tabs */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fafafa', marginHorizontal: 16, borderRadius: 8 }}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: tab === t.key ? 2 : 0, borderBottomColor: tab === t.key ? '#FF6B35' : 'transparent' }}
              onPress={() => setTab(t.key)}
            >
              <Ionicons name={t.icon as any} size={22} color={tab === t.key ? '#FF6B35' : '#888'} />
              <Text style={{ fontSize: 13, color: tab === t.key ? '#FF6B35' : '#888', fontWeight: tab === t.key ? 'bold' : 'normal', marginTop: 2 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Posts Grid/List (Tab Content) */}
        <View style={{ flex: 1, margin: 16, padding: 0, borderRadius: 8 }}>
          {tab === 'posts' && (
            posts.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No posts yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {posts.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    {item.media && item.media[0]?.type === 'image' && (
                      <Image source={{ uri: item.media[0].url }} style={styles.gridThumb} />
                    )}
                    {item.media && item.media[0]?.type === 'video' && (
                      <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                    )}
                    {(!item.media || item.media[0]?.type === 'text') && (
                      <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="document-text-outline" size={32} color="#888" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
          {tab === 'reels' && (
            reels.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No reels yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {reels.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
          {tab === 'tagged' && (
            posts.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No tagged posts yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {posts.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    {item.media && item.media[0]?.type === 'image' && (
                      <Image source={{ uri: item.media[0].url }} style={styles.gridThumb} />
                    )}
                    {item.media && item.media[0]?.type === 'video' && (
                      <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                    )}
                    {(!item.media || item.media[0]?.type === 'text') && (
                      <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="document-text-outline" size={32} color="#888" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
          {tab === 'saved' && isOwner && (
            posts.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No saved posts yet.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {posts.map((item, idx) => (
                  <TouchableOpacity key={item.id || idx} style={styles.gridItem} onPress={() => setPostDetails(item)}>
                    {item.media && item.media[0]?.type === 'image' && (
                      <Image source={{ uri: item.media[0].url }} style={styles.gridThumb} />
                    )}
                    {item.media && item.media[0]?.type === 'video' && (
                      <View style={styles.gridThumb}><Ionicons name="film-outline" size={32} color="#888" /></View>
                    )}
                    {(!item.media || item.media[0]?.type === 'text') && (
                      <View style={[styles.gridThumb, { justifyContent: 'center', alignItems: 'center' }]}> 
                        <Ionicons name="document-text-outline" size={32} color="#888" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </View>
        {/* Post Details Modal */}
        {postDetails && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 30 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '92%', maxHeight: '90%' }}>
              <TouchableOpacity onPress={handleClosePost} style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}>
                <Ionicons name="close-circle" size={32} color="#FF6B35" />
              </TouchableOpacity>
              {/* Post Media */}
              <View style={{ alignItems: 'center', marginBottom: 12, marginTop: 16 }}>
                {postDetails.media && postDetails.media[0]?.type === 'image' && (
                  <Image source={{ uri: postDetails.media[0].url }} style={{ width: 260, height: 260, borderRadius: 12, backgroundColor: '#eee' }} resizeMode="cover" />
                )}
                {postDetails.media && postDetails.media[0]?.type === 'video' && (
                  <View style={{ width: 260, height: 260, borderRadius: 12, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="film-outline" size={64} color="#888" />
                  </View>
                )}
                {(!postDetails.media || postDetails.media[0]?.type === 'text') && (
                  <View style={{ width: 260, height: 120, borderRadius: 12, backgroundColor: '#fafafa', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#444', fontSize: 18 }}>{postDetails.caption || 'No content'}</Text>
                  </View>
                )}
              </View>
              {/* Likes/Comments */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity onPress={handleLike} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18 }}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#FF6B35' : '#888'} />
                  <Text style={{ marginLeft: 6, color: liked ? '#FF6B35' : '#888', fontWeight: 'bold' }}>{likes.length}</Text>
                </TouchableOpacity>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#888" style={{ marginRight: 6 }} />
                <Text style={{ color: '#888' }}>{comments.length}</Text>
              </View>
              {/* Comments List */}
              <View style={{ maxHeight: 120, marginBottom: 8 }}>
                {comments.length === 0 ? (
                  <Text style={{ color: '#aaa', fontStyle: 'italic' }}>No comments yet.</Text>
                ) : (
                  comments.map((c, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="person-circle-outline" size={18} color="#888" style={{ marginRight: 6 }} />
                      <Text style={{ color: '#444', fontWeight: 'bold', marginRight: 4 }}>{c.user?.display_name || c.user?.username || 'User'}:</Text>
                      <Text style={{ color: '#444' }}>{c.content}</Text>
                    </View>
                  ))
                )}
      </View>
              {/* Add Comment */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TextInput
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Add a comment..."
                  style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 6, padding: 8, marginRight: 8 }}
                />
                <TouchableOpacity onPress={handleAddComment} style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
      {/* Settings Modal */}
      {settingsModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '80%' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>Settings</Text>
            <TouchableOpacity
              onPress={async () => { await signOut(); setSettingsModal(false); }}
              style={{ backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign Out</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSettingsModal(false)} style={{ alignItems: 'center', padding: 10 }}>
              <Text style={{ color: '#888', fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    );
  } catch (err) {
    console.error('[ProfileScreen] Render error:', err);
    return <View style={styles.loading}><Text>Render error: {String(err)}</Text></View>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { marginBottom: 12 },
  displayName: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  username: { fontSize: 16, color: '#888', marginBottom: 8 },
  bio: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4cd137', marginRight: 6 },
  statusText: { fontSize: 13, color: '#888' },
  statsRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 12 },
  stat: { alignItems: 'center', marginHorizontal: 18 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  statLabel: { fontSize: 13, color: '#888' },
  actionsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, marginBottom: 8, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 6, marginVertical: 4 },
  actionBtnActive: { backgroundColor: '#888' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
  avatarModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  avatarModalImg: { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4 },
  avatarModalClose: { position: 'absolute', top: 60, right: 30 },
  tabsRow: { flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fafafa' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#FF6B35' },
  tabLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  tabLabelActive: { color: '#FF6B35', fontWeight: 'bold' },
  tabContent: { minHeight: 300 },
  gridItem: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f2f2f2' },
  gridThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 },
});

// 4. Remove the old FriendListItem component at the bottom of the file 