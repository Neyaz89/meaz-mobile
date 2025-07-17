import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, Platform, StyleSheet, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import UserAvatar from '../components/UserAvatar';
import { Colors } from '../constants/Colors';
import { useChat } from '../hooks/useChat';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useFriendsStore } from '../store/friendsStore';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉', '🙏', '👏'];


const ChatsScreen = () => {
  const { user } = useAuthStore();
  const {
    chats,
    activeChat,
    setActiveChat,
    messages,
    sendMessage,
    currentUser,
    getTypingUsers,
    setTyping,
    loading,
    fetchChats,
  } = useChat();
  const { friends } = useFriendsStore();
  const {
    muteChat,
    unmuteChat,
    pinChat,
    unpinChat,
    deleteChat,
  } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { theme } = useTheme();
  const themeColors = Colors[theme] || Colors.light;
  // Helper to safely access theme color with fallback
  const getThemeColor = (key: string, fallback: string) => (themeColors as any)[key] || fallback;
  const [chatProfiles, setChatProfiles] = useState<{ [chatId: string]: any }>({});
  const [lastSeens, setLastSeens] = useState<{ [chatId: string]: string }>({});
  const [unreadCounts, setUnreadCounts] = useState<{ [chatId: string]: number }>({});
  const [lastMessages, setLastMessages] = useState<{ [chatId: string]: any }>({});
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<any[]>([]);
  const windowHeight = Dimensions.get('window').height;

  // Animation shared values
  const sendScale = useSharedValue(1);
  const emojiScale = useSharedValue(1);

  // Animated styles
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));
  const emojiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  // Remove all code related to stories bar, story viewer modal, and stories logic
  // Remove imports: StoryViewer, useStoriesStore
  // Remove allStories, isAddStory, getAvatarUrl, getDisplayName, isUnseen, openStoryViewer, handleAddStory, showStoryViewer, storyViewerStories, storyViewerIndex, useEffect for loading stories
  // Remove the <View style={styles.storiesBarContainer}>...</View> and the <Modal> for story viewer
  // Only keep the chat list, chat item rendering, and contact picker modal

  useEffect(() => {
    if (user) {
      fetchChats();
    }
  }, [user]);

  useEffect(() => {
    if (user && chats.length > 0) {
      (async () => {
        const chatIds = chats.filter((c: any) => c.type === 'direct').map((c: any) => c.id);
        if (chatIds.length === 0) return;
        const { data, error } = await supabase
          .from('chat_profiles')
          .select('chat_id, user_id, username, avatar_url')
          .in('chat_id', chatIds);
        if (!error && data) {
          const profiles: { [chatId: string]: any } = {};
          const userIds: string[] = [];
          data.forEach((row: any) => {
            if (row.user_id !== user.id) {
              profiles[row.chat_id] = row;
              userIds.push(row.user_id);
            }
          });
          setChatProfiles(profiles);
          // Fetch last seen for each user
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from('users')
              .select('id, last_seen')
              .in('id', userIds);
            if (!usersError && usersData) {
              const seens: { [chatId: string]: string } = {};
              usersData.forEach((u: any) => {
                const chatId = Object.keys(profiles).find(cid => profiles[cid].user_id === u.id);
                if (chatId) seens[chatId] = new Date(u.last_seen).toLocaleString();
              });
              setLastSeens(seens);
            }
          }
        }
      })();
    }
  }, [user, chats]);

  // Fetch last message and unread count for each chat
  useEffect(() => {
    if (user && chats.length > 0 && messages) {
      const unread: { [chatId: string]: number } = {};
      chats.forEach((chat: any) => {
        let chatMsgs = messages[chat.id];
        if (!Array.isArray(chatMsgs)) {
          if (chatMsgs) {
            chatMsgs = [chatMsgs];
          } else {
            chatMsgs = [];
            }
        }
        unread[chat.id] = chatMsgs.filter(
          (msg: any) =>
            msg.senderId !== user.id &&
            (!msg.seenBy || !msg.seenBy.includes(user.id)) &&
            !msg.is_deleted
        ).length;
          });
          setUnreadCounts(unread);
        }
  }, [user, chats, messages]);

  // Use friends from useFriendsStore for the contact picker
  // Update filteredContacts to filter friends by search
  useEffect(() => {
    if (!contactSearch) {
      setFilteredContacts(friends);
    } else {
      setFilteredContacts(
        friends.filter((c) =>
          (c.displayName || c.username || '').toLowerCase().includes(contactSearch.toLowerCase())
        )
      );
    }
  }, [contactSearch, friends]);

  // Start or get chat and navigate
  const handleContactSelect = async (contact: any) => {
    setShowContactModal(false);
    const { data, error } = await supabase.rpc('start_or_get_chat', {
      user_a: user!.id,
      user_b: contact.id,
    });
    if (data && !error) {
      (navigation as any).navigate('ChatDetail', { chatId: data });
    } else {
      showToast('Failed to start chat.');
    }
  };

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  // Safety check - don't render if user is not available
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <ThemedText style={styles.emptySubtitle}>Loading user data...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const renderRightActions = (item: any) => {
    const isMuted = item.is_muted;
    const isPinned = item.is_pinned;
    return (
      <View style={{ flexDirection: 'row', height: '100%' }}>
        <TouchableOpacity
          style={{ backgroundColor: isMuted ? '#4CAF50' : '#FF6B35', justifyContent: 'center', alignItems: 'center', width: 72 }}
          onPress={() => isMuted ? unmuteChat(item.id) : muteChat(item.id)}
        >
          <Ionicons name={isMuted ? 'volume-high' : 'volume-mute'} size={24} color="#fff" />
          <ThemedText style={{ color: '#fff', fontSize: 12 }}>{isMuted ? 'Unmute' : 'Mute'}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: isPinned ? '#888' : '#2196F3', justifyContent: 'center', alignItems: 'center', width: 72 }}
          onPress={() => isPinned ? unpinChat(item.id) : pinChat(item.id)}
        >
          <Ionicons name={isPinned ? 'pin' : 'pin-outline'} size={24} color="#fff" />
          <ThemedText style={{ color: '#fff', fontSize: 12 }}>{isPinned ? 'Unpin' : 'Pin'}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center', width: 72 }}
          onPress={() => deleteChat(item.id)}
        >
          <Ionicons name="trash" size={24} color="#fff" />
          <ThemedText style={{ color: '#fff', fontSize: 12 }}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderChatItem = ({ item }: { item: any }) => {
    let displayName = item.name;
    let avatar = require('../assets/images/default-avatar.png');
    let lastSeen = '';
    if (item.type === 'direct' && chatProfiles[item.id]) {
      displayName = chatProfiles[item.id].username;
      if (chatProfiles[item.id].avatar_url) {
        avatar = { uri: chatProfiles[item.id].avatar_url };
      }
      lastSeen = lastSeens[item.id] || '';
    }
    const lastMsg = lastMessages[item.id]?.content || 'Start a conversation';
    const unread = unreadCounts[item.id] || 0;
    // Typing indicator logic
    const typingUsers = getTypingUsers ? getTypingUsers(item.id, user.id) : [];
    const isTyping = typingUsers && typingUsers.length > 0;
    let typingText = '';
    if (isTyping) {
      typingText = typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.join(', ')} are typing...`;
    }
    return (
      <Swipeable key={item.id} renderRightActions={() => renderRightActions(item)}>
      <TouchableOpacity
        style={styles.chatItem}
          onPress={() => (navigation as any).navigate('ChatDetail', { chatId: item.id })}
      >
        <View style={styles.avatarContainer}>
          <UserAvatar user={item} size={50} style={styles.avatar} />
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
              <ThemedText style={styles.userName}>{displayName}</ThemedText>
              {lastSeen && <ThemedText style={styles.lastSeen}>{lastSeen}</ThemedText>}
          </View>
          <View style={styles.messageContainer}>
              {isTyping ? (
                <ThemedText style={[styles.lastMessage, { color: '#4CAF50', fontStyle: 'italic' }]} numberOfLines={1}>
                  {typingText}
                </ThemedText>
              ) : (
            <ThemedText style={styles.lastMessage} numberOfLines={1}>
                  {lastMsg}
            </ThemedText>
              )}
              {unread > 0 && <View style={styles.unreadBadge}><ThemedText style={styles.unreadBadgeText}>{unread}</ThemedText></View>}
          </View>
        </View>
      </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
      <ThemedText style={styles.emptyTitle}>No chats yet</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Start a conversation with your friends
      </ThemedText>
      <TouchableOpacity
        style={styles.newChatButton}
        onPress={() => navigation.navigate('Search' as never)}
      >
        <ThemedText style={styles.newChatButtonText}>Start New Chat</ThemedText>
      </TouchableOpacity>
      </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Chats</ThemedText>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => navigation.navigate('Search' as never)}
        >
          <Ionicons name="add" size={24} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={chats.length === 0 ? styles.emptyContainer : undefined}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowContactModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Contact Picker Modal */}
      <Modal
        visible={showContactModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: windowHeight * 0.8 }]}> 
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Contact</ThemedText>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalSearch}
              placeholder="Search contacts..."
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholderTextColor="#aaa"
            />
            {friends.length === 0 ? (
              <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 32 }} />
            ) : (
              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => handleContactSelect(item)}
                  >
                    <UserAvatar user={item} size={44} style={styles.contactAvatar} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.contactName}>{item.displayName || item.username}</ThemedText>
                      <ThemedText style={styles.contactUsername}>@{item.username}</ThemedText>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 32 }}>
                    <ThemedText>No contacts found.</ThemedText>
                  </View>
                }
              />
            )}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  newChatButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatItem: {
    flexDirection: 'row',
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
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  lastSeen: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#25d366',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '92%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSearch: {
    backgroundColor: '#f2f2f7',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
    color: '#222',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 14,
    backgroundColor: '#eee',
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  contactUsername: {
    fontSize: 13,
    color: '#888',
  },
});

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

export default ChatsScreen; 