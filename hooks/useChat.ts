import { useCallback, useEffect, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { subscribeToChatMembers, supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Call, Chat, Message, User } from '../types';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

export const useChat = () => {
  const { user } = useAuthStore();
  const [currentUser, setCurrentUser] = useState<User | null>(user);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string[] }>({});

  // Keep currentUser in sync with auth store
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Fetch chats for the logged-in user (via chat_members join)
  useEffect(() => {
    if (!user) return;
    const fetchChats = async () => {
      console.log('[useChat] Fetching chat memberships for user:', user.id);
      const { data: memberships, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);
      if (memberError) {
        console.error('[useChat] Error fetching chat_members:', memberError);
        showToast(memberError.message);
        return;
      }
      console.log('[useChat] memberships:', memberships);
      const chatIds = (memberships || []).map((m: any) => m.chat_id);
      if (chatIds.length === 0) {
        setChats([]);
        console.log('[useChat] No chat memberships found.');
        return;
      }
      console.log('[useChat] Fetching chats with IDs:', chatIds);
      const { data: chats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds);
      if (chatError) {
        console.error('[useChat] Error fetching chats:', chatError);
        showToast(chatError.message);
        return;
      }
      console.log('[useChat] Loaded chats:', chats);
      setChats(chats || []);
    };
    fetchChats();
    // Add real-time subscription for chat_members changes
    const subscription = subscribeToChatMembers(user.id, (payload) => {
      fetchChats();
    });
    return () => {
      if (subscription && subscription.unsubscribe) subscription.unsubscribe();
    };
  }, [user]);

  // Fetch messages for the active chat
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });
      if (error) {
        showToast(error.message);
        return;
      }
      setMessages(data || []);
    };
    fetchMessages();

    // --- REAL-TIME SUBSCRIPTION ---
    const channel = supabase
      .channel('messages_' + activeChat.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${activeChat.id}` },
        (payload) => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  const sendMessage = useCallback(async (content: string, type: Message['type'] = 'text') => {
    if (!activeChat || !currentUser) return;
    const newMessage = {
      chat_id: activeChat.id,
      sender_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      type,
      status: 'sending',
    };
    const { data, error } = await supabase
      .from('messages')
      .insert([newMessage])
      .select();
    if (error) {
      showToast(error.message);
      return;
    }
    if (data) {
      setMessages(prev => [...prev, data[0]]);
    }
  }, [activeChat, currentUser]);

  const startCall = useCallback((type: 'audio' | 'video') => {
    if (!activeChat || !currentUser) return;
    // Remove 'participants', 'startTime', 'isGroupCall', 'quality', and 'effects' if not in Call type
    const call: Call = {
      id: Date.now().toString(),
      type,
      status: 'ringing', // Use a valid status value
      // Optionally add other required fields with defaults
    };
    setActiveCall(call);
  }, [activeChat, currentUser]);

  const endCall = useCallback(() => {
    setActiveCall(null);
  }, []);

  const startRecording = useCallback(() => {
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    // Simulate voice message
    sendMessage('Voice message', 'voice');
  }, [sendMessage]);

  // Call this when a user starts/stops typing
  const setTyping = (chatId: string, userId: string, isTyping: boolean) => {
    setTypingUsers(prev => {
      const users = prev[chatId] || [];
      if (isTyping && !users.includes(userId)) {
        return { ...prev, [chatId]: [...users, userId] };
      } else if (!isTyping && users.includes(userId)) {
        return { ...prev, [chatId]: users.filter(u => u !== userId) };
      }
      return prev;
    });
  };

  // Returns array of userIds typing in the chat (excluding current user)
  const getTypingUsers = (chatId: string, currentUserId: string) => {
    const users = typingUsers[chatId] || [];
    return users.filter(u => u !== currentUserId);
  };

  return {
    chats,
    activeChat,
    setActiveChat,
    messages,
    sendMessage,
    currentUser,
    getTypingUsers,
    setTyping,
    activeCall,
    startCall,
    endCall,
    isRecording,
    startRecording,
    stopRecording,
    typingUsers,
    loading: false, // Add loading state
    fetchChats: async () => {
      if (!user) return;
      console.log('[useChat] (manual) Fetching chat memberships for user:', user.id);
      const { data: memberships, error: memberError } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);
      if (memberError) {
        console.error('[useChat] Error fetching chat_members:', memberError);
        showToast(memberError.message);
        return;
      }
      console.log('[useChat] memberships:', memberships);
      const chatIds = (memberships || []).map((m: any) => m.chat_id);
      if (chatIds.length === 0) {
        setChats([]);
        console.log('[useChat] No chat memberships found.');
        return;
      }
      console.log('[useChat] Fetching chats with IDs:', chatIds);
      const { data: chats, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds);
      if (chatError) {
        console.error('[useChat] Error fetching chats:', chatError);
        showToast(chatError.message);
        return;
      }
      console.log('[useChat] Loaded chats:', chats);
      setChats(chats || []);
    },
  };
}; 