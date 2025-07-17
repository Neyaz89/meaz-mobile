import { Platform, ToastAndroid } from 'react-native';
import { create } from 'zustand';
import { Database, subscribeToFriendRequests, supabase } from '../lib/supabase';
import { User } from '../types';

type FriendRequest = Database['public']['Tables']['friend_requests']['Row'] & {
  sender?: Database['public']['Tables']['users']['Row'];
};

interface FriendSuggestion {
  id: string;
  displayName: string;
  username: string;
  avatar: string;
  mutualFriends: number;
  reason: string;
}

interface FriendsState {
  friends: User[];
  friendRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  suggestions: FriendSuggestion[];
  blockedUsers: User[];
  searchResults: User[];
  isLoading: boolean;
  error: string | null;
  subscription?: any; // Add subscription property
  
  // Actions
  fetchFriends: () => Promise<void>;
  fetchFriendRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<User[]>;
  sendFriendRequest: (receiverId: string) => Promise<{ error: any }>;
  acceptFriendRequest: (requestId: string) => Promise<{ error: any }>;
  rejectFriendRequest: (requestId: string) => Promise<{ error: any }>;
  removeFriend: (friendId: string) => Promise<{ error: any }>;
  subscribeToFriendRequests: () => void;
  unsubscribeFromFriendRequests: () => void;
  loadFriends: () => Promise<void>;
  loadFriendRequests: () => Promise<void>;
  loadBlockedUsers: () => Promise<void>;
  blockUser: (userId: string, reason?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  reportUser: (userId: string, reason: string, evidence?: any) => Promise<void>;
  getSuggestions: () => Promise<User[]>;
  isUserBlocked: (userId: string) => boolean;
  isUserFriend: (userId: string) => boolean;
  hasFriendRequest: (userId: string) => boolean;
  clearError: () => void;
  initialize: () => Promise<void>;
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    console.log('Toast:', message);
  }
}

// Helper function to map database user to app user
const mapDatabaseUserToUser = (dbUser: any): User => ({
  id: dbUser.id,
  email: dbUser.email,
  username: dbUser.username,
  displayName: dbUser.display_name,
  avatar: dbUser.avatar_url || '',
  status: dbUser.status as User['status'],
  lastSeen: dbUser.last_seen ? new Date(dbUser.last_seen) : new Date(dbUser.created_at || Date.now()),
  isTyping: false,
  bio: dbUser.bio || '',
  phone: dbUser.phone || '',
  location: dbUser.location || '',
  joinedAt: dbUser.created_at ? new Date(dbUser.created_at) : new Date(0),
  settings: dbUser.settings || {
    notifications: {
      messages: true,
      calls: true,
      stories: true,
      friendRequests: true,
      mentions: true,
      reactions: true,
    },
    privacy: {
      lastSeen: 'everyone',
      profilePhoto: 'everyone',
      status: 'everyone',
      readReceipts: true,
      typingIndicator: true,
    },
    chat: {
      enterToSend: true,
      mediaAutoDownload: false,
      messageBackup: false,
    },
    calls: {
      autoRecord: false,
      noiseSuppression: false,
      echoCancellation: false,
    },
  },
  theme: dbUser.theme || {
    id: '',
    name: 'Default',
    primary: '#000',
    secondary: '#fff',
    accent: '#007AFF',
    background: '#fff',
    bubbleStyle: 'flat',
    chatBackground: '#fff',
    fontFamily: 'System',
    fontSize: 'medium',
    animations: true,
    soundEffects: true,
  },
  friends: [],
  blockedUsers: [],
  mutedChats: [],
  pinnedChats: [],
  customStickers: [],
  achievements: dbUser.achievements || [],
  streakCount: dbUser.streak_count || 0,
  totalMessages: dbUser.total_messages || 0,
  favoriteEmojis: dbUser.favorite_emojis || ['😊', '👍', '❤️', '😂', '🔥'],
  premiumTier: dbUser.premium_tier || 'free',
  lastActivity: dbUser.last_activity ? new Date(dbUser.last_activity) : new Date(dbUser.created_at || Date.now()),
  timezone: dbUser.timezone || 'UTC',
  language: dbUser.language || 'en',
  notificationSettings: dbUser.notification_settings || {
    push: true,
    email: true,
    sms: false,
    sound: true,
    vibration: true,
    quietHours: { enabled: false, start: '00:00', end: '07:00' },
  },
  privacySettings: dbUser.privacy_settings || {
    profileVisibility: 'public',
    allowFriendRequests: true,
    allowMessages: 'everyone',
    allowCalls: 'everyone',
    showOnlineStatus: true,
    showLastSeen: true,
    showReadReceipts: true,
    showTypingIndicator: true,
  },
});

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  friendRequests: [],
  sentRequests: [],
  suggestions: [],
  blockedUsers: [],
  searchResults: [],
  isLoading: false,
  error: null,
  subscription: undefined,
  profileSubscriptions: new Map(), // Track subscriptions for cleanup

  // Load user's friends
  loadFriends: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false, error: 'User not authenticated' });
        return;
      }

      console.log('Loading friends for user:', user.id);

      // Fetch friends where user is user_id
      const { data: friends1, error: error1 } = await supabase
        .from('friends')
        .select(`
          friend_id,
          users!friends_friend_id_fkey (
            id,
            email,
            username,
            display_name,
            avatar_url,
            status,
            bio,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id);

      // Fetch friends where user is friend_id
      const { data: friends2, error: error2 } = await supabase
        .from('friends')
        .select(`
          user_id,
          users!friends_user_id_fkey (
            id,
            email,
            username,
            display_name,
            avatar_url,
            status,
            bio,
            created_at,
            updated_at
          )
        `)
        .eq('friend_id', user.id);

      if (error1) {
        console.error('Error fetching friends1:', error1);
        throw error1;
      }
      if (error2) {
        console.error('Error fetching friends2:', error2);
        throw error2;
      }

      // Map to User[] and merge, deduplicate by id
      const formattedFriends1 = (friends1 || []).map((friend: any) => {
        const user = mapDatabaseUserToUser(friend.users);
        return {
          ...user,
          avatar: user.avatar || '', // Ensure empty string instead of null/undefined
        };
      });
      const formattedFriends2 = (friends2 || []).map((friend: any) => {
        const user = mapDatabaseUserToUser(friend.users);
        return {
          ...user,
          avatar: user.avatar || '', // Ensure empty string instead of null/undefined
        };
      });
      const allFriends = [...formattedFriends1, ...formattedFriends2].filter((f, i, arr) => 
        arr.findIndex(ff => ff.id === f.id) === i
      );

      console.log('Loaded friends:', allFriends.length);
      set({ friends: allFriends, isLoading: false });
    } catch (error: any) {
      console.error('Error loading friends:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Load friend requests
  loadFriendRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false, error: 'User not authenticated' });
        return;
      }

      console.log('Loading friend requests for user:', user.id);

      const { data: requests, error } = await supabase
        .from('friend_requests')
        .select(`
          id,
          from_user_id,
          to_user_id,
          status,
          message,
          created_at,
          updated_at,
          from_user:users!friend_requests_from_user_id_fkey (
            id,
            username,
            display_name,
            avatar_url,
            status,
            bio
          )
        `)
        .eq('to_user_id', user.id)
        .eq('status', 'pending');

      if (error) {
        console.error('Error loading friend requests:', error);
        throw error;
      }

      // Ensure sender is always populated and fallback to from_user_id if needed
      const formattedRequests = (requests || []).map((request: any) => ({
        id: request.id,
        from_user_id: request.from_user_id,
        to_user_id: request.to_user_id,
        status: request.status,
        message: request.message,
        created_at: request.created_at,
        updated_at: request.updated_at,
        sender: request.from_user || { id: request.from_user_id, username: 'Unknown', display_name: 'Unknown', avatar_url: '', status: '', bio: '' },
      }));

      console.log('Loaded friend requests:', formattedRequests.length);
      set({ friendRequests: formattedRequests, isLoading: false });
    } catch (error: any) {
      console.error('Error loading friend requests:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Load blocked users
  loadBlockedUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isLoading: false, error: 'User not authenticated' });
        return;
      }

      const { data: blocks, error } = await supabase
        .from('user_blocks')
        .select(`
          blocked_id,
          blocked_user:users!user_blocks_blocked_id_fkey (
            id,
            email,
            username,
            display_name,
            avatar_url,
            status,
            bio,
            created_at,
            updated_at
          )
        `)
        .eq('blocker_id', user.id);

      if (error) {
        console.error('Error loading blocked users:', error);
        throw error;
      }

      const formattedBlocks = blocks?.map((block: any) => mapDatabaseUserToUser(block.blocked_user)) || [];
      set({ blockedUsers: formattedBlocks, isLoading: false });
    } catch (error: any) {
      console.error('Error loading blocked users:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  // Send friend request
  sendFriendRequest: async (toUserId: string, message?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // Prevent sending to self
      if (user.id === toUserId) {
        return { error: { message: 'You cannot send a friend request to yourself.' } };
      }

      // Check if already friends
      const { data: existingFriend } = await supabase
        .from('friends')
        .select('id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${toUserId}),and(user_id.eq.${toUserId},friend_id.eq.${user.id})`)
        .single();

      if (existingFriend) {
        return { error: { message: 'You are already friends with this user.' } };
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${user.id})`)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return { error: { message: 'A friend request is already pending with this user.' } };
        }
      }

      const { data: request, error } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: user.id,
          to_user_id: toUserId,
          message,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending friend request:', error);
        return { error };
      }

      console.log('Friend request sent successfully');
      return { error: null };
    } catch (error: any) {
      console.error('Error in sendFriendRequest:', error);
      return { error };
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('id', requestId)
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .single();

      if (fetchError || !request) {
        console.error('[acceptFriendRequest] Friend request not found or already processed.', { requestId, fetchError, request });
        return { error: { message: 'Friend request not found or already processed.' } };
      }

      // Update request status to accepted
      const { error: updateError } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) {
        console.error('[acceptFriendRequest] Error updating friend request:', updateError);
        return { error: updateError };
      }

      // Create friendship records for both users
      const { error: friendError1 } = await supabase
        .from('friends')
        .insert({
          user_id: request.from_user_id,
          friend_id: request.to_user_id,
        });

      const { error: friendError2 } = await supabase
        .from('friends')
        .insert({
          user_id: request.to_user_id,
          friend_id: request.from_user_id,
        });

      if (friendError1 || friendError2) {
        console.error('[acceptFriendRequest] Error creating friendship:', friendError1 || friendError2, { request });
        return { error: friendError1 || friendError2 };
      }

      // Create a chat for both users (idempotent)
      // (No longer needed, handled by backend trigger)
      // try {
      //   const [userA, userB] = [request.from_user_id, request.to_user_id].sort();
      //   const { data: { user: currentUser } } = await supabase.auth.getUser();
      //   console.log('[acceptFriendRequest] Current user for chat creation:', currentUser?.id);
      //   console.log('[acceptFriendRequest] Attempting chat creation:', { userA, userB, requestId, request });
      //   const { data: chatId, error: chatError } = await supabase.rpc('start_or_get_chat', {
      //     user_a: userA,
      //     user_b: userB,
      //   });
      //   if (chatError) {
      //     console.error('[acceptFriendRequest] start_or_get_chat error:', chatError, { userA, userB, requestId, request });
      //   } else {
      //     console.log('[acceptFriendRequest] Chat created successfully:', { chatId, userA, userB, requestId });
      //     if (typeof get().loadChats === 'function') {
      //       await get().loadChats();
      //     }
      //   }
      // } catch (err) {
      //   console.error('[acceptFriendRequest] Could not create chat after accepting:', err, { requestId, request });
      // }
      // Instead, just reload chats after accepting
      if (typeof get().loadChats === 'function') {
        await get().loadChats();
      }

      // Refresh requests and friends
      await get().loadFriendRequests();
      await get().loadFriends();

      console.log('[acceptFriendRequest] Friend request accepted successfully', { requestId, request });
      return { error: null };
    } catch (error: any) {
      console.error('[acceptFriendRequest] Unexpected error:', error, { requestId });
      return { error };
    }
  },

  // Reject friend request
  rejectFriendRequest: async (requestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('to_user_id', user.id);

      if (error) {
        console.error('Error rejecting friend request:', error);
        return { error };
      }

      // Refresh requests
      await get().loadFriendRequests();

      console.log('Friend request rejected successfully');
      return { error: null };
    } catch (error: any) {
      console.error('Error in rejectFriendRequest:', error);
      return { error };
    }
  },

  // Remove friend
  removeFriend: async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'User not authenticated' } };

      // Delete both friendship records
      const { error: error1 } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      const { error: error2 } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);

      if (error1 || error2) {
        console.error('Error removing friend:', error1 || error2);
        return { error: error1 || error2 };
      }

      console.log('Friend removed successfully');
      return { error: null };
    } catch (error: any) {
      console.error('Error in removeFriend:', error);
      return { error };
    }
  },

  // Block user
  blockUser: async (userId: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: block, error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: userId,
          reason,
        })
        .select()
        .single();

      if (error) {
        console.error('Error blocking user:', error);
        return;
      }

      // Remove from friends if they were friends
      set(state => ({
        friends: state.friends.filter(friend => friend.id !== userId),
      }));

      console.log('User blocked successfully');
    } catch (error: any) {
      console.error('Error in blockUser:', error);
      set({ error: error.message });
    }
  },

  // Unblock user
  unblockUser: async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) {
        console.error('Error unblocking user:', error);
        return;
      }

      set(state => ({
        blockedUsers: state.blockedUsers.filter(block => block.id !== userId),
      }));

      console.log('User unblocked successfully');
    } catch (error: any) {
      console.error('Error in unblockUser:', error);
      set({ error: error.message });
    }
  },

  // Report user
  reportUser: async (userId: string, reason: string, evidence?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: report, error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_id: userId,
          reason,
          evidence,
        })
        .select()
        .single();

      if (error) {
        console.error('Error reporting user:', error);
        return;
      }

      console.log('User reported successfully');
      return report;
    } catch (error: any) {
      console.error('Error in reportUser:', error);
      set({ error: error.message });
    }
  },

  // Search users (robust filtering)
  searchUsers: async (query: string): Promise<User[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated for search');
        return [];
      }

      console.log('Searching for users with query:', query);

      const { data: users, error } = await supabase
        .from('users')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          status,
          bio,
          created_at,
          updated_at
        `)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) {
        console.error('Error searching users:', error);
        throw error;
      }

      console.log('Raw search results:', users?.length || 0);

      // Get current state for filtering
      const state = get();
      const currentFriends = state.friends.map(f => f.id);
      const currentBlocked = state.blockedUsers.map(b => b.id);
      const currentRequests = state.friendRequests.map(r => r.from_user_id);

      // Filter out self, friends, blocked, and pending requests
      const filteredUsers = (users || []).filter((u: any) => {
        const isSelf = u.id === user.id;
        const isFriend = currentFriends.includes(u.id);
        const isBlocked = currentBlocked.includes(u.id);
        const hasRequest = currentRequests.includes(u.id);

        console.log(`User ${u.username}: self=${isSelf}, friend=${isFriend}, blocked=${isBlocked}, hasRequest=${hasRequest}`);

        return !isSelf && !isFriend && !isBlocked && !hasRequest;
      });

      console.log('Filtered search results:', filteredUsers.length);

      return filteredUsers.map((user: any) => mapDatabaseUserToUser(user));
    } catch (error: any) {
      console.error('Error in searchUsers:', error);
      set({ error: error.message });
      return [];
    }
  },

  // Get user suggestions (robust filtering)
  getSuggestions: async (): Promise<User[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated for suggestions');
        return [];
      }

      console.log('Getting suggestions for user:', user.id);

      const { data: suggestions, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          username,
          display_name,
          avatar_url,
          status,
          bio,
          created_at,
          updated_at
        `)
        .neq('id', user.id)
        .limit(10);

      if (error) {
        console.error('Error getting suggestions:', error);
        return [];
      }

      console.log('Raw suggestions:', suggestions?.length || 0);

      // Get current state for filtering
      const state = get();
      const currentFriends = state.friends.map(f => f.id);
      const currentBlocked = state.blockedUsers.map(b => b.id);
      const currentRequests = state.friendRequests.map(r => r.from_user_id);

      // Filter out self, friends, blocked, and pending requests
      const filteredSuggestions = (suggestions || []).filter((u: any) => {
        const isSelf = u.id === user.id;
        const isFriend = currentFriends.includes(u.id);
        const isBlocked = currentBlocked.includes(u.id);
        const hasRequest = currentRequests.includes(u.id);

        console.log(`Suggestion ${u.username}: self=${isSelf}, friend=${isFriend}, blocked=${isBlocked}, hasRequest=${hasRequest}`);

        return !isSelf && !isFriend && !isBlocked && !hasRequest;
      });

      console.log('Filtered suggestions:', filteredSuggestions.length);

      return filteredSuggestions.map(mapDatabaseUserToUser);
    } catch (error: any) {
      console.error('Error in getSuggestions:', error);
      set({ error: error.message });
      return [];
    }
  },

  // Check if user is blocked
  isUserBlocked: (userId: string) => {
    const state = get();
    return state.blockedUsers.some(block => block.id === userId);
  },

  // Check if user is friend
  isUserFriend: (userId: string) => {
    const state = get();
    return state.friends.some(friend => friend.id === userId);
  },

  // Check if friend request exists
  hasFriendRequest: (userId: string) => {
    const state = get();
    return state.friendRequests.some(request => request.from_user_id === userId);
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Initialize store
  initialize: async () => {
    console.log('Initializing friends store...');
    await Promise.all([
      get().loadFriends(),
      get().loadFriendRequests(),
      get().loadBlockedUsers(),
    ]);
    console.log('Friends store initialized');
  },

  // subscribeToFriendRequests: now async and guarded
  subscribeToFriendRequests: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user for friend request subscription');
      return;
    }

    console.log('Setting up friend request subscription for user:', user.id);

    const subscription = subscribeToFriendRequests(user.id, (payload) => {
      console.log('Friend request subscription payload:', payload);
      
      if (payload.eventType === 'INSERT') {
        const newRequest = payload.new as any;
        set(state => ({
          friendRequests: [...state.friendRequests, {
            id: newRequest.id,
            from_user_id: newRequest.from_user_id,
            to_user_id: newRequest.to_user_id,
            status: newRequest.status,
            message: newRequest.message,
            created_at: newRequest.created_at,
            updated_at: newRequest.updated_at,
            sender: newRequest.from_user,
          }]
        }));
      } else if (payload.eventType === 'UPDATE') {
        const updatedRequest = payload.new as any;
        set(state => ({
          friendRequests: state.friendRequests.map(req => 
            req.id === updatedRequest.id ? { ...req, ...updatedRequest } : req
          )
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedRequest = payload.old as any;
        set(state => ({
          friendRequests: state.friendRequests.filter(req => req.id !== deletedRequest.id)
        }));
      }
    });

    // Store subscription for cleanup
    set({ subscription });
  },

  // Unsubscribe from friend requests
  unsubscribeFromFriendRequests: () => {
    const state = get();
    if (state.subscription) {
      state.subscription.unsubscribe();
    }
  },

  // Legacy methods for compatibility
  fetchFriends: async () => {
    await get().loadFriends();
  },

  fetchFriendRequests: async () => {
    await get().loadFriendRequests();
  },

  // Set up real-time subscriptions for friends' profile updates
  setupRealTimeSubscriptions: () => {
    const { friends } = get();
    const subscriptions = new Map();

    friends.forEach(friend => {
      const channel = supabase
        .channel(`friend_profile_${friend.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${friend.id}`
          },
          (payload) => {
            console.log('Real-time friend profile update:', payload);
            const updatedUser = payload.new;
            if (updatedUser) {
              // Update the friend in the friends list
              set(state => ({
                friends: state.friends.map(f => 
                  f.id === friend.id 
                    ? {
                        ...f,
                        displayName: updatedUser.display_name || f.displayName,
                        avatar: updatedUser.avatar_url || f.avatar,
                        bio: updatedUser.bio || f.bio,
                        status: updatedUser.status || f.status,
                        lastSeen: updatedUser.last_seen ? new Date(updatedUser.last_seen) : f.lastSeen,
                      }
                    : f
                )
              }));
            }
          }
        )
        .subscribe();

      subscriptions.set(friend.id, channel);
    });

    set({ profileSubscriptions: subscriptions });
  },

  // Cleanup real-time subscriptions
  cleanupSubscriptions: () => {
    const { profileSubscriptions } = get();
    profileSubscriptions.forEach(channel => {
      channel.unsubscribe();
    });
    set({ profileSubscriptions: new Map() });
  },
})); 