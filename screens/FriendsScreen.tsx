import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import UserAvatar from '../components/UserAvatar';
import { useToast } from '../components/ui/Toast';
import { Colors } from '../constants/Colors';
import { Database, supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

type FriendRequest = Database['public']['Tables']['friend_requests']['Row'] & {
  sender?: Database['public']['Tables']['users']['Row'];
};

const FriendsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [newFriendUsername, setNewFriendUsername] = useState('');
  const { theme } = useTheme();
  const themeColors = Colors[theme] || Colors.light;
  const toast = useToast();
  
  // Helper to safely access theme color with fallback
  const getThemeColor = (key: string, fallback: string) => (themeColors as any)[key] || fallback;

  const { 
    friends: realFriends, 
    friendRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest,
    loadFriends,
    loadFriendRequests,
    subscribeToFriendRequests,
    removeFriend,
    isLoading,
    getSuggestions,
    searchUsers
  } = useFriendsStore();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Safety check - don't render if user is not available
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  // Load friends and friend requests when component mounts
  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    subscribeToFriendRequests();
  }, [loadFriends, loadFriendRequests, subscribeToFriendRequests]);

  // Fetch suggestions on mount or when search is cleared
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestionsLoading(true);
      getSuggestions()
        .then((suggestions) => {
          console.log('Friend suggestions loaded:', suggestions?.length || 0);
          setSuggestedUsers(suggestions || []);
        })
        .catch((error) => {
          console.error('Error loading suggestions:', error);
      setSuggestedUsers([]);
        })
        .finally(() => setSuggestionsLoading(false));
    }
  }, [searchQuery, realFriends, user]);

  // Search users when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    searchUsers(searchQuery.trim())
      .then((users) => {
        console.log('Search users loaded:', users?.length || 0);
        setSearchResults(users || []);
      })
      .catch((error) => {
        console.error('Error searching users:', error);
        setSearchError('Failed to search users');
        setSearchResults([]);
      })
      .finally(() => setSearchLoading(false));
  }, [searchQuery, realFriends, user]);

  const handleAddFriend = async () => {
    if (!newFriendUsername.trim()) {
      toast.error('Please enter a valid username');
      return;
    }

    try {
      // First search for the user by username
      const { data: users, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', newFriendUsername.trim())
        .single();

      if (error || !users) {
        toast.error('User not found');
        return;
      }

      const result = await sendFriendRequest(users.id);
      if (result.error) {
        toast.error(result.error.message || 'Failed to send friend request');
      } else {
        toast.success('Friend request sent!');
        setNewFriendUsername('');
        setShowAddFriend(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  const handleAddFriendFromSearch = async (userId: string) => {
    try {
      const result = await sendFriendRequest(userId);
      if (result.error) {
        toast.error(result.error.message || 'Failed to send friend request');
      } else {
        toast.success('Friend request sent!');
        // Refresh search results to remove the user
        if (searchQuery.trim()) {
          const refreshedResults = await searchUsers(searchQuery.trim());
          setSearchResults(refreshedResults || []);
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const result = await acceptFriendRequest(requestId);
    await loadFriendRequests();
    await loadFriends();
    if (result.error) {
      toast.error(result.error.message || 'Failed to accept request');
    } else {
      toast.success('Friend request accepted!');
      // Chat creation is handled in acceptFriendRequest (store logic), no need to call Edge Function or duplicate chat creation here.
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    const result = await rejectFriendRequest(requestId);
    await loadFriendRequests();
    await loadFriends();
    if (result.error) {
      toast.error(result.error.message || 'Failed to reject request');
    } else {
      toast.info('Friend request rejected');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeFriend(friendId);
            if (result.error) {
              toast.error(result.error.message || 'Failed to remove friend');
            } else {
              toast.success('Friend removed');
    }
          },
        },
      ]
    );
  };

  // Helper to open or create a direct chat
  const openOrCreateDirectChat = async (friend: any) => {
    try {
      console.log('[ChatButton] Pressed for friend:', friend);
      // Always fetch the latest session before making the RPC call
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[ChatButton] Failed to get session:', sessionError);
        throw new Error('Failed to get session');
      }
      const sessionUser = sessionData?.session?.user;
      if (!sessionUser || !sessionUser.id) {
        console.error('[ChatButton] Not authenticated: session user is', sessionUser);
        throw new Error('Not authenticated');
      }
      const currentUserId = sessionUser.id;
      // Defensive check for RLS
      if (currentUserId !== sessionUser.id) {
        console.error('[start_or_get_chat] Mismatch: currentUserId does not match session user!');
        throw new Error('Session user mismatch');
      }
      // Log for debugging RLS issues
      console.log('[openOrCreateDirectChat] Auth user:', sessionUser.id, 'Passing as user_a:', currentUserId, 'Friend:', friend.id);
      // Use the new Supabase RPC function to get or create the direct chat
      const { data: chatId, error } = await supabase.rpc('start_or_get_chat', {
        user_a: currentUserId,
        user_b: friend.id,
      });
      console.log('[start_or_get_chat] RPC result:', { chatId, error });
      if (error || !chatId) {
        console.error('start_or_get_chat error:', error);
        throw error || new Error('No chat ID returned');
      }
      // Navigate directly to the chat detail screen
      (navigation as any).navigate('ChatDetail', { chatId });
    } catch (err: any) {
      console.error('Could not start chat:', err);
      toast.error('Could not start chat');
    }
  };

  const renderFriendItem = ({ item }: { item: any }) => {
    console.log('[FriendsScreen] Navigating to ProfileScreen with userId:', item.id);
    return (
    <View style={styles.friendItem}>
        <TouchableOpacity style={styles.avatarContainer} onPress={() => { console.log('[FriendsScreen] onPress avatar, userId:', item.id); navigation.navigate('ProfileScreen', { userId: item.id }); }}>
          <UserAvatar user={item} size={50} />
        {(item.isOnline || item.status === 'online') && <View style={styles.onlineIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.friendInfo} onPress={() => { console.log('[FriendsScreen] onPress info, userId:', item.id); navigation.navigate('ProfileScreen', { userId: item.id }); }}>
        <ThemedText style={styles.friendName}>{item.displayName}</ThemedText>
        <ThemedText style={styles.friendUsername}>@{item.username}</ThemedText>
        {item.bio && (
          <ThemedText style={styles.friendBio} numberOfLines={1}>
            {item.bio}
          </ThemedText>
        )}
        </TouchableOpacity>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => openOrCreateDirectChat(item)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#FF6B35" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFriend(item.id)}
        >
          <Ionicons name="person-remove-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={styles.requestItem}>
      <View style={styles.avatarContainer}>
        <UserAvatar user={item.sender} size={50} />
      </View>

      <View style={styles.requestInfo}>
        <ThemedText style={styles.requestName}>{item.sender?.display_name}</ThemedText>
        <ThemedText style={styles.requestUsername}>@{item.sender?.username}</ThemedText>
        {item.message && (
          <ThemedText style={styles.requestMessage} numberOfLines={2}>
            {item.message}
          </ThemedText>
        )}
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={styles.acceptButton}
          onPress={() => handleAcceptRequest(item.id)}
        >
          <Ionicons name="checkmark" size={20} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.rejectButton}
          onPress={() => handleRejectRequest(item.id)}
        >
          <Ionicons name="close" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadFriends(), loadFriendRequests()]);
    setRefreshing(false);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <ThemedText style={styles.emptyTitle}>
        {activeTab === 'friends' ? 'No friends yet' : 'No friend requests'}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {activeTab === 'friends' 
          ? 'Start adding friends to see them here'
          : 'When someone sends you a friend request, it will appear here'
        }
      </ThemedText>
    </View>
  );

  const renderUserResult = (item: any) => (
    <View style={styles.userResult}>
      <View style={styles.avatarContainer}>
        <UserAvatar user={item} size={50} />
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>{item.displayName}</ThemedText>
        <ThemedText style={styles.userUsername}>@{item.username}</ThemedText>
        {item.bio && (
          <ThemedText style={styles.userBio} numberOfLines={2}>
            {item.bio}
          </ThemedText>
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleAddFriendFromSearch(item.id)}
      >
        <Ionicons name="person-add-outline" size={20} color="#FF6B35" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Friends</ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddFriend(true)}
        >
          <Ionicons name="person-add" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search friends or find new ones..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends ({realFriends.length})
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            Requests ({friendRequests.length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Suggestions Section */}
      {!searchQuery.trim() && activeTab === 'friends' && suggestedUsers.length > 0 && (
        <View style={styles.suggestionsSection}>
          <ThemedText style={styles.suggestionsTitle}>People you may know</ThemedText>
          <FlatList
            data={suggestedUsers}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.suggestionItem}>
                <UserAvatar user={item} size={40} />
                <ThemedText style={styles.suggestionName}>{item.displayName}</ThemedText>
                <TouchableOpacity
                  style={styles.suggestionAddButton}
                  onPress={() => handleAddFriendFromSearch(item.id)}
                >
                  <ThemedText style={styles.suggestionAddButtonText}>Add Friend</ThemedText>
                </TouchableOpacity>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {searchQuery.trim() ? (
        // Show search results
        <FlatList
          data={searchResults}
          renderItem={({ item }) => renderUserResult(item)}
          keyExtractor={(item) => item.id}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={
            searchLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
                <ThemedText style={styles.loadingText}>Searching...</ThemedText>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <ThemedText style={styles.emptyTitle}>No users found</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Try searching with a different username or display name
                </ThemedText>
        </View>
            )
          }
          showsVerticalScrollIndicator={false}
        />
      ) : activeTab === 'friends' ? (
        // Show friends list
        <FlatList
          data={realFriends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={realFriends.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        // Show friend requests
        <FlatList
          data={friendRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={friendRequests.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Add Friend Modal */}
      <Modal
        visible={showAddFriend}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddFriend(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Friend</ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddFriend(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
            <TextInput
                style={styles.usernameInput}
              placeholder="Enter username"
              value={newFriendUsername}
              onChangeText={setNewFriendUsername}
              autoCapitalize="none"
                autoCorrect={false}
            />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddFriend(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleAddFriend}
              >
                <ThemedText style={styles.sendButtonText}>Send Request</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  friendInfo: {
    flex: 1,
  },
  requestInfo: {
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  friendUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 14,
    color: '#888',
    lineHeight: 18,
  },
  requestMessage: {
    fontSize: 14,
    color: '#888',
    lineHeight: 18,
  },
  userBio: {
    fontSize: 14,
    color: '#888',
    lineHeight: 18,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatButton: {
    padding: 8,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  acceptButton: {
    padding: 8,
    marginRight: 8,
  },
  rejectButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  usernameInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
  },
  sendButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  suggestionsSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  suggestionItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    width: 120,
  },
  suggestionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  suggestionAddButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  suggestionAddButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});

export default FriendsScreen; 