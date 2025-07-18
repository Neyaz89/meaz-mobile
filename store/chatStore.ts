import { Platform, ToastAndroid } from 'react-native';
import { create } from 'zustand';
import { Database, subscribeToMessageReactions, subscribeToPollVotes, subscribeToVoiceChannels, supabase } from '../lib/supabase';
import { Chat, ChatState, Message, PinnedMessage, Poll, User, VoiceChannel } from '../types';
// TODO: Add a custom Toast component for iOS if needed

type DatabaseMessage = Database['public']['Tables']['messages']['Row'];
type DatabaseChat = Database['public']['Tables']['chats']['Row'];
type DatabaseUser = Database['public']['Tables']['users']['Row'];
type DatabasePoll = Database['public']['Tables']['polls']['Row'];
type DatabaseMessageReaction = Database['public']['Tables']['message_reactions']['Row'];
type DatabaseVoiceChannel = Database['public']['Tables']['voice_channels']['Row'];
type DatabasePinnedMessage = Database['public']['Tables']['pinned_messages']['Row'];

export function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

// Helper function to map database user to app user
const mapDatabaseUserToUser = (dbUser: DatabaseUser): User => ({
  id: dbUser.id,
  email: dbUser.email,
  username: dbUser.username,
  displayName: dbUser.display_name,
  avatar: dbUser.avatar_url || '',
  status: dbUser.status,
  lastSeen: new Date(dbUser.last_seen),
  bio: dbUser.bio || '',
  phone: dbUser.phone || '',
  location: dbUser.location || '',
  joinedAt: new Date(dbUser.created_at),
  settings: dbUser.settings || {},
  theme: dbUser.theme || {},
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
  lastActivity: new Date(dbUser.last_activity),
  timezone: dbUser.timezone || undefined,
  language: dbUser.language || 'en',
  notificationSettings: dbUser.notification_settings || {},
  privacySettings: dbUser.privacy_settings || {}
});

// Helper function to map database message to app message
const mapDatabaseMessageToMessage = (dbMessage: DatabaseMessage): Message => ({
  id: dbMessage.id,
  chatId: dbMessage.chat_id,
  senderId: dbMessage.sender_id || '',
  content: dbMessage.content,
  type: dbMessage.type,
  attachments: dbMessage.attachments || [],
  replyTo: dbMessage.reply_to || undefined,
  isEdited: dbMessage.is_edited,
  isDeleted: dbMessage.is_deleted,
  isStarred: dbMessage.is_starred,
  isTemporary: dbMessage.is_temporary,
  expiresAt: dbMessage.expires_at ? new Date(dbMessage.expires_at) : undefined,
  viewed: dbMessage.viewed,
  createdAt: new Date(dbMessage.created_at),
  updatedAt: new Date(dbMessage.updated_at),
  forwardCount: dbMessage.forward_count || 0,
  originalSenderId: dbMessage.original_sender_id || undefined,
  translation: dbMessage.translation || { originalText: '', translatedText: '', sourceLanguage: '', targetLanguage: '', confidence: 0 },
  encryptionKey: dbMessage.encryption_key || undefined,
  isEncrypted: dbMessage.is_encrypted || false
});

// Helper function to map database poll to app poll
const mapDatabasePollToPoll = (dbPoll: DatabasePoll): Poll => ({
  id: dbPoll.id,
  messageId: dbPoll.message_id,
  question: dbPoll.question,
  options: dbPoll.options || [],
  allowMultiple: dbPoll.allow_multiple,
  expiresAt: dbPoll.expires_at ? new Date(dbPoll.expires_at) : undefined,
  createdAt: new Date(dbPoll.created_at),
  votes: [],
  totalVotes: 0
});

// Helper function to map database voice channel to app voice channel
const mapDatabaseVoiceChannelToVoiceChannel = (dbChannel: DatabaseVoiceChannel): VoiceChannel => ({
  id: dbChannel.id,
  name: dbChannel.name,
  description: dbChannel.description || undefined,
  chatId: dbChannel.chat_id,
  createdBy: dbChannel.created_by || undefined,
  maxParticipants: dbChannel.max_participants,
  isActive: dbChannel.is_active,
  createdAt: new Date(dbChannel.created_at),
  updatedAt: new Date(dbChannel.updated_at),
  participants: [],
  participantCount: 0
});

// Helper function to map database pinned message to app pinned message
const mapDatabasePinnedMessageToPinnedMessage = (dbPinned: DatabasePinnedMessage): PinnedMessage => ({
  id: dbPinned.id,
  chatId: dbPinned.chat_id,
  messageId: dbPinned.message_id,
  pinnedBy: dbPinned.pinned_by || undefined,
  pinnedAt: new Date(dbPinned.pinned_at)
});

interface ChatStoreState extends ChatState {
  // Enhanced actions for advanced features
  addReaction: (messageId: string, reaction: string) => Promise<void>;
  removeReaction: (messageId: string, reaction: string) => Promise<void>;
  createPoll: (chatId: string, question: string, options: string[], allowMultiple?: boolean, expiresAt?: Date) => Promise<void>;
  voteInPoll: (pollId: string, selectedOptions: string[]) => Promise<void>;
  pinMessage: (chatId: string, messageId: string) => Promise<void>;
  unpinMessage: (chatId: string, messageId: string) => Promise<void>;
  loadVoiceChannels: (chatId: string) => Promise<void>;
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: (channelId: string) => Promise<void>;
  loadPinnedMessages: (chatId: string) => Promise<void>;
  forwardMessage: (messageId: string, targetChatId: string) => Promise<void>;
  translateMessage: (messageId: string, targetLanguage: string) => Promise<void>;
  subscribeToReactions: (messageId: string) => void;
  unsubscribeFromReactions: (messageId: string) => void;
  subscribeToPolls: (pollId: string) => void;
  unsubscribeFromPolls: (pollId: string) => void;
  subscribeToVoiceChannels: (chatId: string) => void;
  unsubscribeFromVoiceChannels: (chatId: string) => void;
  muteChat: (chatId: string) => Promise<void>;
  unmuteChat: (chatId: string) => Promise<void>;
  pinChat: (chatId: string) => Promise<void>;
  unpinChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  addMessage: (chatId: string, dbMessage: DatabaseMessage) => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  chats: [],
  currentChat: null,
  messages: {}, // { [chatId: string]: Message[] }
  isLoading: false,
  error: null,
  typingUsers: [],
  onlineUsers: [],

  // Load user's chats
  loadChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: chatMembers, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          chat_id,
          chats (
            id,
            name,
            type,
            description,
            avatar_url,
            created_by,
            settings,
            customization,
            is_archived,
            is_verified,
            created_at,
            updated_at,
            last_message_id,
            join_link,
            join_link_expires_at,
            is_encrypted,
            encryption_key,
            auto_delete_timer
          )
        `)
        .eq('user_id', user.id);

      if (membersError) throw membersError;

      const mappedChatsRaw = chatMembers?.map(member => {
        const chat = Array.isArray(member.chats) ? member.chats[0] : member.chats;
        if (!chat) return null;
        return {
          id: chat.id,
          name: chat.name,
          type: chat.type,
          description: chat.description,
          avatar: chat.avatar_url,
          createdBy: chat.created_by,
          settings: chat.settings || {},
          customization: chat.customization || {},
          isArchived: chat.is_archived,
          isVerified: chat.is_verified,
          createdAt: new Date(chat.created_at),
          updatedAt: new Date(chat.updated_at),
          lastMessageId: chat.last_message_id,
          joinLink: chat.join_link,
          joinLinkExpiresAt: chat.join_link_expires_at ? new Date(chat.join_link_expires_at) : undefined,
          isEncrypted: chat.is_encrypted,
          encryptionKey: chat.encryption_key,
          autoDeleteTimer: chat.auto_delete_timer,
          members: [],
          pinnedMessages: [],
          voiceChannels: [],
        };
      }) || [];
      const mappedChats: Chat[] = mappedChatsRaw.filter(Boolean);

      set({ chats: mappedChats, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, isLoading: false });
    }
  },

  // Load chat members
  loadChatMembers: async (chatId: string) => {
    try {
      const { data: members, error } = await supabase
        .from('chat_members')
        .select(`
          id,
          chat_id,
          user_id,
          role,
          joined_at,
          last_read_at,
          is_muted,
          is_pinned,
          users (
            id,
            username,
            display_name,
            avatar_url,
            status,
            is_online
          )
        `)
        .eq('chat_id', chatId);

      if (error) throw error;

      const chatMembers = members?.map(member => ({
        id: member.id,
        chatId: member.chat_id,
        userId: member.user_id,
        role: member.role,
        joinedAt: new Date(member.joined_at),
        lastReadAt: new Date(member.last_read_at),
        isMuted: member.is_muted,
        isPinned: member.is_pinned,
        user: member.users ? mapDatabaseUserToUser(member.users) : undefined,
      })) || [];

      // Update the chat with members
      set(state => ({
        chats: state.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, members: chatMembers }
            : chat
        ),
        currentChat: state.currentChat?.id === chatId 
          ? { ...state.currentChat, members: chatMembers }
          : state.currentChat
      }));
    } catch (error) {
      console.error('Error loading chat members:', error);
    }
  },

  // Load messages for a chat
  loadMessages: async (chatId: string, limit: number = 50) => {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          users (
            id,
            username,
            display_name,
            avatar_url,
            status
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const mappedMessages = messages?.map(msg => ({
        ...mapDatabaseMessageToMessage(msg),
        sender: msg.users ? mapDatabaseUserToUser(msg.users) : undefined,
      })) || [];

      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: mappedMessages
        }
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  },

  // Send a message
  sendMessage: async (chatId: string, content: string, type: string = 'text', isTemporary: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
          type,
          is_temporary: isTemporary,
          expires_at: isTemporary ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage = mapDatabaseMessageToMessage(message);
      set(state => ({
        messages: {
          ...state.messages,
          [chatId]: [newMessage, ...(state.messages[chatId] || [])]
        }
      }));

      return { error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      if (typeof showToast === 'function') showToast('Failed to send message: ' + (error.message || 'Unknown error'));
      return { error };
    }
  },

  // Add reaction to message
  addReaction: async (messageId: string, reaction: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          reaction
        });

      if (error) throw error;

      showToast(`Added ${reaction} reaction`);
    } catch (error) {
      console.error('Error adding reaction:', error);
      showToast('Failed to add reaction');
    }
  },

  // Remove reaction from message
  removeReaction: async (messageId: string, reaction: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('reaction', reaction);

      if (error) throw error;

      showToast(`Removed ${reaction} reaction`);
    } catch (error) {
      console.error('Error removing reaction:', error);
      showToast('Failed to remove reaction');
    }
  },

  // Create a poll
  createPoll: async (chatId: string, question: string, options: string[], allowMultiple: boolean = false, expiresAt?: Date) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First create the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: question,
          type: 'poll'
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Then create the poll
      const { error: pollError } = await supabase
        .from('polls')
        .insert({
          message_id: message.id,
          question,
          options: options.map((option, index) => ({
            id: index.toString(),
            text: option,
            votes: 0
          })),
          allow_multiple: allowMultiple,
          expires_at: expiresAt?.toISOString()
        });

      if (pollError) throw pollError;

      if (typeof showToast === 'function') showToast('Poll created successfully');
      return { error: null };
    } catch (error) {
      console.error('Error creating poll:', error);
      if (typeof showToast === 'function') showToast('Failed to create poll: ' + (error.message || 'Unknown error'));
      return { error };
    }
  },

  // Vote in a poll
  voteInPoll: async (pollId: string, selectedOptions: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('poll_votes')
        .upsert({
          poll_id: pollId,
          user_id: user.id,
          selected_options: selectedOptions
        });

      if (error) throw error;

      showToast('Vote recorded');
    } catch (error) {
      console.error('Error voting in poll:', error);
      showToast('Failed to record vote');
    }
  },

  // Pin a message
  pinMessage: async (chatId: string, messageId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('pinned_messages')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          pinned_by: user.id
        });

      if (error) throw error;

      showToast('Message pinned');
    } catch (error) {
      console.error('Error pinning message:', error);
      showToast('Failed to pin message');
    }
  },

  // Unpin a message
  unpinMessage: async (chatId: string, messageId: string) => {
    try {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('chat_id', chatId)
        .eq('message_id', messageId);

      if (error) throw error;

      showToast('Message unpinned');
    } catch (error) {
      console.error('Error unpinning message:', error);
      showToast('Failed to unpin message');
    }
  },

  // Load pinned messages
  loadPinnedMessages: async (chatId: string) => {
    try {
      const { data: pinnedMessages, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          messages (*),
          users (id, username, display_name, avatar_url)
        `)
        .eq('chat_id', chatId);

      if (error) throw error;

      const mappedPinnedMessages = pinnedMessages?.map(pinned => ({
        ...mapDatabasePinnedMessageToPinnedMessage(pinned),
        message: pinned.messages ? mapDatabaseMessageToMessage(pinned.messages) : undefined,
        pinnedByUser: pinned.users ? mapDatabaseUserToUser(pinned.users) : undefined,
      })) || [];

      set(state => ({
        chats: state.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, pinnedMessages: mappedPinnedMessages }
            : chat
        )
      }));
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    }
  },

  // Load voice channels
  loadVoiceChannels: async (chatId: string) => {
    try {
      const { data: voiceChannels, error } = await supabase
        .from('voice_channels')
        .select('*')
        .eq('chat_id', chatId)
        .eq('is_active', true);

      if (error) throw error;

      const mappedVoiceChannels = voiceChannels?.map(channel => mapDatabaseVoiceChannelToVoiceChannel(channel)) || [];

      set(state => ({
        chats: state.chats.map(chat => 
          chat.id === chatId 
            ? { ...chat, voiceChannels: mappedVoiceChannels }
            : chat
        )
      }));
    } catch (error) {
      console.error('Error loading voice channels:', error);
    }
  },

  // Join voice channel
  joinVoiceChannel: async (channelId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('voice_channel_participants')
        .insert({
          channel_id: channelId,
          user_id: user.id
        });

      if (error) throw error;

      showToast('Joined voice channel');
    } catch (error) {
      console.error('Error joining voice channel:', error);
      showToast('Failed to join voice channel');
    }
  },

  // Leave voice channel
  leaveVoiceChannel: async (channelId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('voice_channel_participants')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;

      showToast('Left voice channel');
    } catch (error) {
      console.error('Error leaving voice channel:', error);
      showToast('Failed to leave voice channel');
    }
  },

  // Forward message
  forwardMessage: async (messageId: string, targetChatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the original message
      const { data: originalMessage, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      // Create forwarded message
      const { error: forwardError } = await supabase
        .from('messages')
        .insert({
          chat_id: targetChatId,
          sender_id: user.id,
          content: originalMessage.content,
          type: originalMessage.type,
          attachments: originalMessage.attachments,
          original_sender_id: originalMessage.sender_id,
          forward_count: (originalMessage.forward_count || 0) + 1
        });

      if (forwardError) throw forwardError;

      showToast('Message forwarded');
    } catch (error) {
      console.error('Error forwarding message:', error);
      showToast('Failed to forward message');
    }
  },

  // Translate message
  translateMessage: async (messageId: string, targetLanguage: string) => {
    try {
      // This would integrate with a translation service like Google Translate
      // For now, we'll just update the message with a placeholder translation
      const { error } = await supabase
        .from('messages')
        .update({
          translation: {
            originalText: 'Original text',
            translatedText: 'Translated text',
            sourceLanguage: 'en',
            targetLanguage,
            confidence: 0.95
          }
        })
        .eq('id', messageId);

      if (error) throw error;

      showToast('Message translated');
    } catch (error) {
      console.error('Error translating message:', error);
      showToast('Failed to translate message');
    }
  },

  // Set current chat
  setCurrentChat: (chat: Chat | null) => {
    set({ currentChat: chat });
  },

  // Set typing status
  setTypingStatus: (chatId: string, userId: string, isTyping: boolean) => {
    set(state => ({
      typingUsers: isTyping 
        ? [...state.typingUsers.filter(id => id !== userId), userId]
        : state.typingUsers.filter(id => id !== userId)
    }));
  },

  // Set online status
  setOnlineStatus: (userId: string, isOnline: boolean) => {
    set(state => ({
      onlineUsers: isOnline 
        ? [...state.onlineUsers.filter(id => id !== userId), userId]
        : state.onlineUsers.filter(id => id !== userId)
    }));
  },

  // Subscribe to real-time updates
  subscribeToReactions: (messageId: string) => {
    subscribeToMessageReactions(messageId, (payload) => {
      console.log('Reaction update:', payload);
      // Update message reactions in real-time
    });
  },

  unsubscribeFromReactions: (messageId: string) => {
    // Unsubscribe logic would go here
  },

  subscribeToPolls: (pollId: string) => {
    subscribeToPollVotes(pollId, (payload) => {
      console.log('Poll vote update:', payload);
      // Update poll votes in real-time
    });
  },

  unsubscribeFromPolls: (pollId: string) => {
    // Unsubscribe logic would go here
  },

  subscribeToVoiceChannels: (chatId: string) => {
    subscribeToVoiceChannels(chatId, (payload) => {
      console.log('Voice channel update:', payload);
      // Update voice channels in real-time
    });
  },

  unsubscribeFromVoiceChannels: (chatId: string) => {
    // Unsubscribe logic would go here
  },

  // Mute a chat
  muteChat: async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('chat_members')
        .update({ is_muted: true })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
      if (error) throw error;
      showToast('Chat muted');
      // Optionally update state
    } catch (error) {
      console.error('Error muting chat:', error);
      showToast('Failed to mute chat');
    }
  },
  // Unmute a chat
  unmuteChat: async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('chat_members')
        .update({ is_muted: false })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
      if (error) throw error;
      showToast('Chat unmuted');
      // Optionally update state
    } catch (error) {
      console.error('Error unmuting chat:', error);
      showToast('Failed to unmute chat');
    }
  },
  // Pin a chat
  pinChat: async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('chat_members')
        .update({ is_pinned: true })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
      if (error) throw error;
      showToast('Chat pinned');
      // Optionally update state
    } catch (error) {
      console.error('Error pinning chat:', error);
      showToast('Failed to pin chat');
    }
  },
  // Unpin a chat
  unpinChat: async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('chat_members')
        .update({ is_pinned: false })
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
      if (error) throw error;
      showToast('Chat unpinned');
      // Optionally update state
    } catch (error) {
      console.error('Error unpinning chat:', error);
      showToast('Failed to unpin chat');
    }
  },
  // Delete a chat for the current user (remove chat membership)
  deleteChat: async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { error } = await supabase
        .from('chat_members')
        .delete()
        .eq('chat_id', chatId)
        .eq('user_id', user.id);
      if (error) throw error;
      showToast('Chat deleted');
      // Optionally update state
    } catch (error) {
      console.error('Error deleting chat:', error);
      showToast('Failed to delete chat');
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  addMessage: (chatId: string, dbMessage: DatabaseMessage) => set(state => {
    const newMessage = mapDatabaseMessageToMessage(dbMessage);
    return {
      messages: {
        ...state.messages,
        [chatId]: [newMessage, ...(state.messages[chatId] || [])]
      }
    };
  })
}));

// Clean up expired messages periodically
setInterval(() => {
  const state = useChatStore.getState();
  const now = new Date();

  Object.keys(state.messages).forEach(chatId => {
    const expiredMessages = (state.messages[chatId] || []).filter((msg: DatabaseMessage) => 
      msg.is_temporary && msg.expires_at && new Date(msg.expires_at) < now
    );

    if (expiredMessages.length > 0) {
      useChatStore.setState(currentState => ({
        messages: {
          ...currentState.messages,
          [chatId]: (currentState.messages[chatId] || []).filter((msg: DatabaseMessage) => 
            !msg.is_temporary || !msg.expires_at || new Date(msg.expires_at) >= now
          )
        }
      }));
    }
  });
}, 1000); // Check every second 