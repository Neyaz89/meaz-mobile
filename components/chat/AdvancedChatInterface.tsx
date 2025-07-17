import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState as useReactState, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    Animated,
    Button,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    FlatList as RNFlatList,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import EmojiSelector from 'react-native-emoji-selector';
import { useChatBackground, useChatHeaderData, useChatSearch, useGiphy, useMuteChat, usePinnedMessage, usePolls, useSeenDelivered, useStarredMessages, useTypingStatus, useVoiceMessages } from '../../hooks/chatHooks';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { ThemedText } from '../ThemedText';
// 1. Import GroupManager
import { ResizeMode, Video } from 'expo-av';
import Constants from 'expo-constants';
import { AppState, Linking } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { fetchUserProfile, uploadFile } from '../../lib/supabase';
import { showToast } from '../../store/chatStore';
import { useNotificationStore } from '../../store/notificationStore';
import CallInterface from '../call/CallInterface';
import CallService from '../call/CallService';
import { GroupManager } from '../group/GroupManager';
import { ActionMenu } from './ActionMenu';
import { InputBar } from './InputBar';
import { MessageBubble } from './MessageBubble';
import { MessageList } from './MessageList';

interface AdvancedChatInterfaceProps {
  chat: any;
  onBack: () => void;
}

export const AdvancedChatInterface: React.FC<AdvancedChatInterfaceProps> = ({ chat, onBack }) => {
  const { user } = useAuthStore();
  // UseChatStore as any to avoid type mismatch for now
  const sendMessage = (useChatStore as any)((state: any) => state.sendMessage);
  const loadMessages = (useChatStore as any)((state: any) => state.loadMessages);
  const messages = useChatStore(state => state.messages);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [recording, setRecording] = useState(false);
  const [background, setBackground] = useChatBackground(chat.id);
  const { typing, setTypingStatus } = useTypingStatus(chat.id, user?.id);
  const { seenStatus, deliveredStatus, updateMessageStatus } = useSeenDelivered(chat.id, user?.id) as any;
  const { starredMessages, toggleStar } = useStarredMessages(chat.id, user?.id);
  const { pinnedMessage, setPinned } = usePinnedMessage(chat.id);
  const { searchResults, search, setSearch } = useChatSearch(chat.id);
  const { playVoice, recordVoice, stopRecording, uploadVoice, isRecording } = useVoiceMessages(chat.id, user?.id);
  const { giphyResults, searchGiphy, selectGif } = useGiphy();
  const { headerUser, headerAvatar, lastSeen } = useChatHeaderData(chat, user?.id);
  const { isMuted, setMute } = useMuteChat(chat.id, user?.id);
  const { polls, votes, createPoll, votePoll } = usePolls(chat.id, user?.id);
  const flatListRef = useRef<FlatList>(null);
  const [inputHeight, setInputHeight] = useState(40);
  const [actionMenuMessage, setActionMenuMessage] = useState(null);
  const [animValue] = useState(new Animated.Value(0));
  // Enable LayoutAnimation on Android
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
  // Animated send button
  const [sendAnim] = useState(new Animated.Value(1));
  const animateSend = () => {
    Animated.sequence([
      Animated.timing(sendAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(sendAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };
  // Animated reply bar
  const [replyAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    if (replyTo) {
      Animated.timing(replyAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(replyAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [replyTo]);
  // Animated typing dots
  const TypingDots = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <Animated.View
          key={i}
          style={{
            width: 6, height: 6, borderRadius: 3, backgroundColor: '#aaa', margin: 2,
            opacity: new Animated.Value(0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 300 + i)))
          }}
        />
      ))}
    </View>
  );
  // Animated reaction popup
  const [reactionAnim] = useState(new Animated.Value(0));
  const showReactionPopup = () => {
    Animated.timing(reactionAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
      setTimeout(() => Animated.timing(reactionAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(), 800);
    });
  };

  useEffect(() => {
    loadMessages(chat.id);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [chat.id, loadMessages]);

  const chatMessages = useMemo(() => messages[chat.id] || [], [messages, chat.id]);

  // Debug logging for all advanced features
  useEffect(() => {
    console.log('[AdvancedChatInterface] chat:', chat);
    console.log('[AdvancedChatInterface] user:', user);
    console.log('[AdvancedChatInterface] chatMessages count:', chatMessages.length);
    console.log('[AdvancedChatInterface] typing:', typing);
    console.log('[AdvancedChatInterface] starredMessages:', starredMessages);
    console.log('[AdvancedChatInterface] pinnedMessage:', pinnedMessage);
    console.log('[AdvancedChatInterface] searchResults:', searchResults);
    console.log('[AdvancedChatInterface] giphyResults:', giphyResults);
    console.log('[AdvancedChatInterface] headerUser:', headerUser);
    console.log('[AdvancedChatInterface] headerAvatar:', headerAvatar);
    console.log('[AdvancedChatInterface] lastSeen:', lastSeen);
    console.log('[AdvancedChatInterface] isMuted:', isMuted);
    console.log('[AdvancedChatInterface] polls:', polls);
    console.log('[AdvancedChatInterface] votes:', votes);
  }, [chat, user, chatMessages, typing, starredMessages, pinnedMessage, searchResults, giphyResults, headerUser, headerAvatar, lastSeen, isMuted, polls, votes]);

  // Typing indicator logic
  const handleInputChange = (text: string) => {
    setMessage(text);
    setTypingStatus(true);
    if (text.length === 0) setTypingStatus(false);
  };
  // Ensure typing status is cleared on blur
  const handleInputBlur = () => {
    setTypingStatus(false);
  };
  // Send message
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    animateSend();
    const result = await sendMessage(chat.id, message, 'text', false);
    if (result && result.error) {
      showToast('Failed to send message: ' + (result.error.message || 'Unknown error'));
      return;
    }
    // --- Mention notification logic ---
    if (user) {
      const mentionRegex = /@([\w]+)/g;
      const mentionedUsernames = Array.from(message.matchAll(mentionRegex)).map(m => m[1]);
      const uniqueUsernames = [...new Set(mentionedUsernames)].filter(u => u !== user.username);
      for (const username of uniqueUsernames) {
        try {
          const profile = await fetchUserProfile(username);
          if (profile && profile.id !== user.id) {
            await addNotification({
              user_id: profile.id,
              type: 'mention',
              message: `You were mentioned in a chat: "${message.slice(0, 80)}"`,
              read: false,
            });
          }
        } catch (err) {
          console.warn('Failed to notify mention for', username, err);
        }
      }
    }
    setMessage('');
    setReplyTo(null);
    setTypingStatus(false);
    setTimeout(() => {
      if (chatMessages.length > 0) {
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }
    }, 100);
  };

  // Attachments
  // Poll modal state
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  // Giphy modal state
  const [showGiphyModal, setShowGiphyModal] = useState(false);
  const [giphySearch, setGiphySearch] = useState('');
  // Voice recording state
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  // --- Image/File Upload ---
  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = fileUri.split('/').pop() || 'image.jpg';
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const publicUrl = await uploadFile(blob, `chat_images/${fileName}`);
      await sendMessage(chat.id, publicUrl, 'image', false);
    }
  };
  const handlePickFile = async () => {
    let result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = asset.name || 'file';
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const publicUrl = await uploadFile(blob, `chat_files/${fileName}`);
      await sendMessage(chat.id, publicUrl, 'file', false);
    }
  };

  // --- Poll Modal Logic ---
  const openPollModal = () => {
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollModal(true);
  };
  const handlePollOptionChange = (text: string, idx: number) => {
    setPollOptions(opts => opts.map((o, i) => (i === idx ? text : o)));
  };
  const addPollOption = () => {
    setPollOptions(opts => [...opts, '']);
  };
  const removePollOption = (idx: number) => {
    setPollOptions(opts => opts.filter((_, i) => i !== idx));
  };
  const handleCreatePoll = async (question: string, options: string[]) => {
    // Validate
    const trimmedQuestion = question.trim();
    const trimmedOptions = options.map(o => o.trim()).filter(Boolean);
    if (!trimmedQuestion) {
      showToast('Poll question cannot be empty.');
      return;
    }
    if (trimmedOptions.length < 2) {
      showToast('Please provide at least two options.');
      return;
    }
    // Create poll message
    try {
      const pollPayload = {
        question: trimmedQuestion,
        options: trimmedOptions,
        allowMultiple: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      };
      const result = await sendMessage(chat.id, JSON.stringify(pollPayload), 'poll', false);
    if (result && result.error) {
      showToast('Failed to create poll: ' + (result.error.message || 'Unknown error'));
        return;
      }
      setShowPollModal(false);
      showToast('Poll created!');
    } catch (e) {
      showToast('Failed to create poll.');
    }
  };

  // --- Giphy Modal Logic ---
  const openGiphyModal = () => {
    setGiphySearch('');
    setShowGiphyModal(true);
    searchGiphy('trending');
  };
  const handleGiphySearch = (text: string) => {
    setGiphySearch(text);
    searchGiphy(text);
  };
  const handleSelectGif = (gif: any) => {
    selectGif(gif);
    sendMessage(chat.id, gif.url, 'gif', false);
    setShowGiphyModal(false);
  };

  // --- Voice Recording Logic ---
  const startVoiceRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setAudioRecording(recording);
      setIsVoiceRecording(true);
    } catch (e) {
      setIsVoiceRecording(false);
    }
  };
  const stopVoiceRecording = async () => {
    if (!audioRecording) return;
    setIsVoiceRecording(false);
    await audioRecording.stopAndUnloadAsync();
    const uri = audioRecording.getURI();
    setAudioRecording(null);
    if (uri) {
      setPendingVoiceUri(uri);
      setShowVoiceEffectModal(true);
    }
  };

  // --- Voice Effect Modal Logic ---
  const handleVoiceEffectPreview = async (effect: any) => {
    if (!pendingVoiceUri) return;
    if (voicePreviewSound) {
      await voicePreviewSound.unloadAsync();
      setVoicePreviewSound(null);
    }
    const { sound } = await Audio.Sound.createAsync({ uri: pendingVoiceUri }, { shouldPlay: true, rate: effect.rate, pitchCorrectionQuality: Audio.PitchCorrectionQuality.Low });
    setVoicePreviewSound(sound);
    await sound.playAsync();
  };
  const handleVoiceEffectSend = async () => {
    if (!pendingVoiceUri) return;
      try {
        // Upload to Supabase Storage
        const fileName = `${user.id}_${Date.now()}.m4a`;
        const { data, error } = await supabase.storage.from('meaz-storage').upload(fileName, {
        uri: pendingVoiceUri,
          type: 'audio/m4a',
          name: fileName,
        });
        if (error) {
          showToast('Failed to upload voice message');
        setShowVoiceEffectModal(false);
        setPendingVoiceUri(null);
          return;
        }
        const { publicURL } = supabase.storage.from('meaz-storage').getPublicUrl(fileName).data;
      // Send message with voice_effect metadata
      await supabase.from('messages').insert({
        chat_id: chat.id,
        sender_id: user.id,
        content: publicURL,
        type: 'voice',
        voice_effect: selectedVoiceEffect.key,
      });
      setShowVoiceEffectModal(false);
      setPendingVoiceUri(null);
      setSelectedVoiceEffect(VOICE_EFFECTS[0]);
      } catch (e) {
        showToast('Failed to send voice message');
      setShowVoiceEffectModal(false);
      setPendingVoiceUri(null);
    }
  };

  // --- Voice Message Playback with Effect ---
  const playVoiceWithEffect = async (audioUrl: string, effectKey: string) => {
    const effect = VOICE_EFFECTS.find(e => e.key === effectKey) || VOICE_EFFECTS[0];
    if (voicePreviewSound) {
      await voicePreviewSound.unloadAsync();
      setVoicePreviewSound(null);
    }
    const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true, rate: effect.rate, pitchCorrectionQuality: Audio.PitchCorrectionQuality.Low });
    setVoicePreviewSound(sound);
    await sound.playAsync();
  };

  // Reaction bar state
  const [showReactionBar, setShowReactionBar] = useState(false);
  const [reactionTargetMsg, setReactionTargetMsg] = useState<any>(null);
  // Edit message state
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [editText, setEditText] = useState('');
  // Forward modal state
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [chatsList, setChatsList] = useState<any[]>([]);
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedChats, setSelectedChats] = useState<string[]>([]);

  // Add state to hold all reactions for messages in this chat
  const [allReactions, setAllReactions] = useState<{ [messageId: string]: any[] }>({});

  // Fetch all reactions for messages in this chat
  useEffect(() => {
    async function fetchAllReactions() {
      if (!chatMessages.length) return;
      const messageIds = chatMessages.map((m: any) => m.id);
      const { data, error } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', messageIds);
      if (!error && data) {
        const grouped: { [messageId: string]: any[] } = {};
        data.forEach((r: any) => {
          if (!grouped[r.message_id]) grouped[r.message_id] = [];
          grouped[r.message_id].push(r);
        });
        setAllReactions(grouped);
      }
    }
    fetchAllReactions();
  }, [chatMessages]);

  // Subscribe to real-time reactions for this chat
  useEffect(() => {
    if (!chatMessages.length) return;
    const messageIds = chatMessages.map((m: any) => m.id);
    const channel = supabase
      .channel('message_reactions_' + chat.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
        // On any reaction change, refetch all reactions
        // (for efficiency, you could optimize to update only the affected message)
        if (payload.new && messageIds.includes(payload.new.message_id)) {
          setAllReactions(prev => {
            const updated = { ...prev };
            // Remove old reaction for this user/emoji if exists
            if (payload.eventType === 'DELETE') {
              updated[payload.old.message_id] = (updated[payload.old.message_id] || []).filter((r: any) => !(r.user_id === payload.old.user_id && r.emoji === payload.old.emoji));
            } else {
              // Upsert new reaction
              updated[payload.new.message_id] = [
                ...(updated[payload.new.message_id] || []).filter((r: any) => !(r.user_id === payload.new.user_id && r.emoji === payload.new.emoji)),
                payload.new
              ];
            }
            return updated;
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatMessages, chat.id]);

  // --- Reaction logic ---
  const handleReact = async (msg: any, emoji: string) => {
    setShowReactionBar(false);
    setReactionTargetMsg(null);
    if (!user) return;
    const reactions = allReactions[msg.id] || [];
    const hasReacted = reactions.some((r: any) => r.emoji === emoji && r.user_id === user.id);
    if (hasReacted) {
      await supabase.from('message_reactions').delete().eq('message_id', msg.id).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      await supabase.from('message_reactions').insert({ message_id: msg.id, user_id: user.id, emoji });
    }
  };

  // --- Edit message logic ---
  const startEditMessage = (msg: any) => {
    setEditingMsg(msg);
    setEditText(msg.content);
  };
  const submitEditMessage = () => {
    if (!editingMsg) return;
    // TODO: Backend update
    editingMsg.content = editText;
    editingMsg.isEdited = true;
    setEditingMsg(null);
    setEditText('');
  };
  const cancelEditMessage = () => {
    setEditingMsg(null);
    setEditText('');
  };

  // --- Delete message logic ---
  const handleDeleteMessage = async (msg: any) => {
    await supabase.from('messages').update({ is_deleted: true, content: '[deleted]' }).eq('id', msg.id);
    loadMessages(chat.id);
  };

  // --- Forward message logic ---
  const openForwardModal = async (msg: any) => {
    setForwardMsg(msg);
    setShowForwardModal(true);
    // Fetch all chats (except current)
    const { data, error } = await supabase.from('chats').select('id, name').neq('id', chat.id);
    if (!error && data) setChatsList(data);
  };
  const toggleSelectChat = (chatId: string) => {
    setSelectedChats(sel => sel.includes(chatId) ? sel.filter(id => id !== chatId) : [...sel, chatId]);
  };
  const submitForward = async () => {
    if (!forwardMsg || selectedChats.length === 0) return;
    for (const targetChatId of selectedChats) {
      await sendMessage(targetChatId, forwardMsg.content, forwardMsg.type, false);
    }
    setShowForwardModal(false);
    setForwardMsg(null);
    setSelectedChats([]);
  };

  // Action menu (star, delete, react, reply, copy, forward)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuOptions, setActionMenuOptions] = useState<string[]>([]);
  const [actionMenuMsg, setActionMenuMsg] = useState<any>(null);

  const showActionMenu = (msg: any) => {
    const isOwn = msg.senderId === user.id;
    const options = [
      ...(isOwn ? ['Edit', 'Delete'] : []),
      'Copy', 'Reply', 'Star', 'Pin', 'Cancel'
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: isOwn ? 1 : undefined,
      },
      (buttonIndex) => {
        if (isOwn && buttonIndex === 0) { // Edit
          setEditingMsg(msg);
          setEditText(msg.content);
        } else if (isOwn && buttonIndex === 1) { // Delete
          // Mark as deleted (stub)
          // TODO: Backend delete
          msg.isDeleted = true;
          setEditingMsg(null);
        } else if (buttonIndex === options.indexOf('Copy')) {
          Clipboard.setStringAsync(msg.content);
        } else if (buttonIndex === options.indexOf('Reply')) {
          setReplyTo(msg);
        } else if (buttonIndex === options.indexOf('Star')) {
          toggleStar(msg.id);
        } else if (buttonIndex === options.indexOf('Pin')) {
          setPinned(msg);
        }
      }
    );
  };

  // Add forward and delete logic
  const forwardMessage = async (messageId: string, targetChatId: string) => {
    // Use chatStore forwardMessage if available, else just send as new
    if ((useChatStore as any).getState().forwardMessage) {
      await (useChatStore as any).getState().forwardMessage(messageId, targetChatId);
    } else {
      // Fallback: fetch message and send to target chat
      // Not implemented here
    }
  };
  const deleteMessage = async (messageId: string) => {
    if ((useChatStore as any).getState().deleteMessage) {
      await (useChatStore as any).getState().deleteMessage(messageId);
    } else {
      // Fallback: mark as deleted in messages table
      // await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);
    }
  };

  // 1. Add state for theme/background modal
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [customization, setCustomization] = useState(chat.customization || {});
  const [selectedTheme, setSelectedTheme] = useState(customization.theme || 'classic');
  const [selectedBackground, setSelectedBackground] = useState(customization.background || '');
  const [selectedBubbleStyle, setSelectedBubbleStyle] = useState(customization.bubbleStyle || 'rounded');
  const [selectedFontFamily, setSelectedFontFamily] = useState(customization.fontFamily || 'System');
  const [selectedFontSize, setSelectedFontSize] = useState(customization.fontSize || 'medium');
  const [uploading, setUploading] = useState(false);

  // Listen for chat.customization changes (for real-time updates)
  useEffect(() => {
    setCustomization(chat.customization || {});
    setSelectedTheme(chat.customization?.theme || 'classic');
    setSelectedBackground(chat.customization?.background || '');
    setSelectedBubbleStyle(chat.customization?.bubbleStyle || 'rounded');
    setSelectedFontFamily(chat.customization?.fontFamily || 'System');
    setSelectedFontSize(chat.customization?.fontSize || 'medium');
  }, [chat.customization]);

  // 2. Permission: Only admins/owners can save in group chats
  const isGroup = chat.type === 'group';
  const myRole = user ? (chat.members?.find((m: any) => m.userId === user.id)?.role || 'member') : 'member';
  const canEditTheme = !isGroup || ['admin', 'owner'].includes(myRole);

  // 3. Built-in themes/backgrounds (expanded, more unique)
  const builtInThemes = [
    { key: 'classic', name: 'Classic', colors: ['#25d366', '#fff'], preview: require('../../assets/images/splash-icon.png') },
    { key: 'pastel', name: 'Pastel', colors: ['#a8edea', '#fed6e3'], preview: require('../../assets/images/partial-react-logo.png') },
    { key: 'dark', name: 'Dark', colors: ['#232526', '#414345'], preview: require('../../assets/images/react-logo.png') },
    { key: 'gradient', name: 'Gradient', colors: ['#ff9966', '#ff5e62'], preview: require('../../assets/images/react-logo.png') },
    { key: 'glass', name: 'Glassmorphism', colors: ['#fff', '#e0e0e0'], preview: require('../../assets/images/adaptive-icon.png') },
    { key: 'neon', name: 'Neon', colors: ['#00FFF7', '#FF00EA'], preview: require('../../assets/images/favicon.png') },
    { key: 'cyberpunk', name: 'Cyberpunk', colors: ['#ff00ea', '#00fff7'], preview: require('../../assets/images/splash-icon.png') },
  ];
  const builtInBackgrounds = [
    { key: 'none', name: 'None', type: 'color', value: '#f7f7f7' },
    { key: 'green', name: 'Green', type: 'color', value: '#e0f7fa' },
    { key: 'pattern1', name: 'Pattern 1', type: 'pattern', value: require('../../assets/images/partial-react-logo.png') },
    { key: 'stock1', name: 'Stock 1', type: 'image', value: require('../../assets/images/splash-icon.png') },
    { key: 'cyber', name: 'Cyber Grid', type: 'pattern', value: require('../../assets/images/react-logo.png') },
    { key: 'neon', name: 'Neon Glow', type: 'color', value: '#00FFF7' },
  ];
  const bubbleStyles = [
    { key: 'rounded', name: 'Rounded' },
    { key: 'gradient', name: 'Gradient' },
    { key: 'glass', name: 'Glassmorphism' },
  ];
  const fontFamilies = ['System', 'SpaceMono', 'Arial', 'Roboto'];
  const fontSizes = ['small', 'medium', 'large'];

  // 4. Image picker for custom background
  const handlePickCustomImage = async () => {
    setUploading(true);
    try {
      // Use Expo ImagePicker or similar (pseudo-code)
      // const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
      // if (!result.cancelled) {
      //   // Upload to Supabase Storage or get local URI
      //   setSelectedBackground(result.uri);
      // }
    } finally {
      setUploading(false);
    }
  };

  // Theme/background logic
  const themeColors = (() => {
    switch (customization.theme) {
      case 'dark': return { bg: '#232526', input: '#414345', text: '#fff' };
      case 'gradient': return { bg: 'linear-gradient(90deg, #ff9966, #ff5e62)', input: '#fff', text: '#222' };
      case 'pastel': return { bg: '#a8edea', input: '#fed6e3', text: '#222' };
      case 'classic':
      default: return { bg: '#f7f7f7', input: '#fff', text: '#222' };
    }
  })();

  // 5. Save theme/background to Supabase
  const handleSaveTheme = async () => {
    if (!canEditTheme) return;
    const newCustomization = {
      theme: selectedTheme,
      background: selectedBackground,
      bubbleStyle: selectedBubbleStyle,
      fontFamily: selectedFontFamily,
      fontSize: selectedFontSize,
    };
    setUploading(true);
    await supabase.from('chats').update({ customization: newCustomization }).eq('id', chat.id);
    setUploading(false);
    setShowThemeModal(false);
    // Optimistically update local state
    setCustomization(newCustomization);
  };

  // 6. Replace handleSetBackground to open modal
  const handleSetBackground = () => setShowThemeModal(true);

  // Add state for swiped message
  const [swipedMessageId, setSwipedMessageId] = useReactState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useReactState<'left' | 'right' | null>(null);

  // Read receipts modal state
  const [showSeenModal, setShowSeenModal] = useState(false);
  const [seenModalMsg, setSeenModalMsg] = useState<any>(null);
  const [chatMembers, setChatMembers] = useState<any[]>([]);

  // 2. Add state for group info modal
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Add state for media modal
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaMessages, setMediaMessages] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);

  // Fetch media messages for the chat
  const fetchMediaMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chat.id)
      .in('type', ['image', 'video', 'file'])
      .order('created_at', { ascending: false });
    if (!error && data) setMediaMessages(data);
  };

  // Open media modal and fetch media
  const handleOpenMediaModal = async () => {
    await fetchMediaMessages();
    setShowMediaModal(true);
  };

  // Fetch chat members for avatars/names
  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('chat_members')
        .select('user_id, users (id, display_name, username, avatar_url)')
        .eq('chat_id', chat.id);
      if (!error && data) {
        setChatMembers(data.map((m: any) => ({
          id: m.user_id,
          displayName: m.users?.display_name || m.users?.username || 'User',
          avatar: m.users?.avatar_url || '',
        })));
      }
    };
    fetchMembers();
  }, [chat.id]);

  // Helper: get user info by ID
  const getUserInfo = (userId: string) => chatMembers.find(u => u.id === userId) || { displayName: 'User', avatar: '' };

  // --- Read receipts modal UI ---
  const openSeenModal = (msg: any) => {
    setSeenModalMsg(msg);
    setShowSeenModal(true);
  };

  // --- Typing avatars ---
  const typingUsers = typing.filter((id: string) => id !== user!.id);
  const typingAvatars = typingUsers.map((uid: string) => getUserInfo(uid).avatar).filter(Boolean);
  const typingNames = typingUsers.map((uid: string) => getUserInfo(uid).displayName);

  // Compute the ID of the first unread message for the current user
  const firstUnreadMessageId = useMemo(() => {
    if (!chatMessages || !user?.id) return null;
    // Messages are sorted oldest to newest
    for (let i = 0; i < chatMessages.length; i++) {
      const msg = chatMessages[i];
      const seenBy = seenStatus && seenStatus[msg.id] ? seenStatus[msg.id] : [];
      // Only consider messages not sent by the current user
      if (msg.senderId !== user.id && !seenBy.includes(user.id)) {
        return msg.id;
      }
    }
    // If all received messages are read, return null
    return null;
  }, [chatMessages, seenStatus, user?.id]);

  // Compute the index of the unread divider/message in the flatListData
  const unreadIndex = useMemo(() => {
    if (!firstUnreadMessageId || !chatMessages.length) return null;
    // Reconstruct flatListData as in MessageList
    const grouped: { [date: string]: any[] } = {};
    chatMessages.forEach(msg => {
      const date = new Date(msg.createdAt).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    const flatListData: any[] = [];
    let unreadDividerInserted = false;
    Object.keys(grouped).forEach(date => {
      flatListData.push({ type: 'header', date });
      grouped[date].forEach(msg => {
        if (
          !unreadDividerInserted &&
          firstUnreadMessageId &&
          msg.id === firstUnreadMessageId
        ) {
          flatListData.push({ type: 'unread_divider', id: 'unread-divider' });
          unreadDividerInserted = true;
        }
        flatListData.push({ type: 'message', ...msg });
      });
    });
    // Find the index of the unread divider
    const idx = flatListData.findIndex(item => item.type === 'unread_divider');
    return idx !== -1 ? idx : null;
  }, [chatMessages, firstUnreadMessageId]);

  // Update renderMessage
  const renderMessage = ({ item }: any) => {
    const isOwn = item.senderId === user?.id;
    const reactions = item.reactions || allReactions[item.id] || [];
    // Normalize reactions: [{emoji, users: [userId, ...], count: number}]
    const normalizedReactions = Object.values(reactions.reduce((acc: any, r: any) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, users: [], count: 0 };
      acc[r.emoji].users.push(r.user_id);
      acc[r.emoji].count++;
      return acc;
    }, {}));
    // For each message, get arrays of user IDs who have seen or delivered this message
    const seenBy = seenStatus && seenStatus[item.id] ? seenStatus[item.id] : [];
    const deliveredBy = deliveredStatus && deliveredStatus[item.id] ? deliveredStatus[item.id] : [];
    // Render poll message
    if (item.type === 'poll') {
      let pollData = null;
      try {
        pollData = JSON.parse(item.content);
      } catch {}
  return (
        <View style={{ margin: 8, padding: 12, backgroundColor: '#fffbe6', borderRadius: 12 }}>
          <ThemedText style={{ fontWeight: 'bold', color: '#b8860b', marginBottom: 6 }}>📊 {pollData?.question || 'Poll'}</ThemedText>
          {pollData?.options?.map((opt: string, idx: number) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="ellipse-outline" size={18} color="#b8860b" style={{ marginRight: 6 }} />
              <ThemedText>{opt}</ThemedText>
            </View>
          ))}
        </View>
      );
    }
    return (
      <MessageBubble
        message={item}
        isOwn={isOwn}
        onLongPress={showActionMenu}
        onReply={() => setReplyTo(item)}
        onStar={() => toggleStar(item.id)}
        onPin={() => setPinned(item)}
        onDelete={() => handleDeleteMessage(item)}
        onForward={() => openForwardModal(item)}
        onCopy={() => Clipboard.setStringAsync(item.content)}
        onReact={handleReact}
        seenStatus={seenBy}
        deliveredStatus={deliveredBy}
        replyTo={item.replyTo}
        reactions={normalizedReactions}
        isStarred={starredMessages.includes(item.id)}
        isPinned={pinnedMessage && pinnedMessage.id === item.id}
              onPress={() => openSeenModal(item)}
        onSwipeReply={() => setReplyTo(item)}
        onPlayVoice={() => playVoiceWithEffect(item.content, item.voice_effect)}
        onImagePress={() => {/* handle image preview */}}
        onFilePress={() => {/* handle file preview */}}
      />
    );
  };

  // Animated slide-in
  const slideAnim = animValue.interpolate({ inputRange: [0, 1], outputRange: [100, 0] });

  // Use LayoutAnimation for message list changes
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [chatMessages]);

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      // Scroll to most recent message when keyboard appears
      setTimeout(() => {
        if (chatMessages.length > 0) {
          flatListRef.current?.scrollToIndex({ index: 0, animated: true });
        }
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      // Optional: handle keyboard hide if needed
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [chatMessages]);

  // Add state for starred messages modal
  const [showStarredModal, setShowStarredModal] = useState(false);

  // 1. Add state for mini features modal
  const [showMiniFeatures, setShowMiniFeatures] = useState(false);

  // 3. Add state for header menu
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  useEffect(() => {
    const updatePresence = async (isOnline: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ is_online: isOnline, last_seen: new Date().toISOString() }).eq('id', user.id);
      }
    };
    updatePresence(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updatePresence(true);
      else if (state === 'background' || state === 'inactive') updatePresence(false);
    });
    return () => {
      updatePresence(false);
      subscription.remove();
    };
  }, []);

  const [activeCall, setActiveCall] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);

  // Subscribe to call state changes for incoming/outgoing calls
  useEffect(() => {
    const unsub = CallService.onCallStateChange((call) => {
      if (call && call.status && ['calling', 'ringing', 'accepted'].includes(call.status)) {
        setActiveCall(call);
        setShowCallModal(true);
      } else if (call && ['ended', 'missed', 'rejected'].includes(call.status)) {
        setShowCallModal(false);
        setActiveCall(null);
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  // Add a flag to control notification warning
  const SHOW_NOTIFICATION_WARNING = false; // Set to true to enable the Expo Go notification warning

  useEffect(() => {
    if (SHOW_NOTIFICATION_WARNING && Platform.OS !== 'web' && Constants.appOwnership === 'expo' && notificationsEnabled) {
      Alert.alert(
        'Push Notifications Not Supported',
        'Push notifications are not supported in Expo Go. Please use a development build (EAS Dev Client) for full notification support.'
      );
    }
  }, []);

  const { addNotification } = useNotificationStore();

  // --- Media preview state ---
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [fileModalVisible, setFileModalVisible] = useState(false);
  const [fileModalData, setFileModalData] = useState<{ url: string; name: string } | null>(null);

  // Handler to open image viewer
  const handleImagePress = (msg: any) => {
    // Gather all image messages in chat for gallery
    const images = chatMessages.filter(m => m.type === 'image').map(m => m.content);
    const idx = images.indexOf(msg.content);
    setMediaImages(images);
    setImageViewerIndex(idx >= 0 ? idx : 0);
    setImageViewerVisible(true);
  };

  // Handler to open file modal
  const handleFilePress = (msg: any) => {
    setFileModalData({ url: msg.content, name: msg.attachments?.[0]?.name || 'File' });
    setFileModalVisible(true);
  };

  // --- Search state for highlighting and navigation ---
  const [highlightedResultIdx, setHighlightedResultIdx] = useState(0);
  const searchTerm = searchText.trim();
  const searchActive = searchMode && searchTerm.length > 0 && searchResults.length > 0;
  const highlightedMessageId = searchActive ? searchResults[highlightedResultIdx]?.id : null;

  // Scroll to highlighted search result
  useEffect(() => {
    if (!searchActive || !highlightedMessageId || !flatListRef.current) return;
    // Find index in flatListData (reconstruct as in MessageList)
    const grouped = groupMessagesByDate(searchResults);
    const flatListData = [];
    Object.keys(grouped).forEach(date => {
      flatListData.push({ type: 'header', date });
      grouped[date].forEach(msg => flatListData.push({ type: 'message', ...msg }));
    });
    const idx = flatListData.findIndex(item => item.id === highlightedMessageId);
    if (idx !== -1) {
      flatListRef.current.scrollToIndex({ index: idx, animated: true });
    }
  }, [highlightedResultIdx, highlightedMessageId, searchActive, searchResults]);

  // Helper to group messages by date (same as in MessageList)
  function groupMessagesByDate(messages) {
    const groups = {};
    messages.forEach(msg => {
      const date = new Date(msg.createdAt).toISOString().split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }

  // --- Thread modal state ---
  const [threadModalVisible, setThreadModalVisible] = useState(false);
  const [threadRootMessage, setThreadRootMessage] = useState(null);
  const [threadReply, setThreadReply] = useState('');

  // Open thread modal for a message
  const handleViewThread = (msg) => {
    setThreadRootMessage(msg.replyToMessage || msg);
    setThreadModalVisible(true);
    setThreadReply('');
  };

  // Get all replies to the root message
  const threadReplies = useMemo(() => {
    if (!threadRootMessage) return [];
    return chatMessages.filter(m => m.replyTo === threadRootMessage.id);
  }, [threadRootMessage, chatMessages]);

  // Send reply in thread
  const handleSendThreadReply = async () => {
    if (!threadReply.trim() || !threadRootMessage) return;
    await sendMessage(chat.id, threadReply, 'text', false, threadRootMessage.id);
    setThreadReply('');
  };

  // Open emoji picker for reactions
  const openReactionPicker = (msg: any) => {
    setReactionTargetMsg(msg);
    setShowReactionBar(true);
  };

  // Handle emoji selection for reaction
  const handleSelectReactionEmoji = (emoji: string) => {
    if (reactionTargetMsg) {
      handleReact(reactionTargetMsg, emoji);
      setShowReactionBar(false);
      setReactionTargetMsg(null);
    }
  };

  // Voice effect options
  const VOICE_EFFECTS = [
    { key: 'normal', label: 'Normal', rate: 1.0 },
    { key: 'chipmunk', label: 'Chipmunk', rate: 1.5 },
    { key: 'deep', label: 'Deep', rate: 0.7 },
    { key: 'funny', label: 'Funny', rate: 1.8 },
    { key: 'baby', label: 'Baby', rate: 1.2 },
    { key: 'girl', label: 'Girl', rate: 1.3 },
  ];
  const [showVoiceEffectModal, setShowVoiceEffectModal] = useState(false);
  const [selectedVoiceEffect, setSelectedVoiceEffect] = useState(VOICE_EFFECTS[0]);
  const [voicePreviewSound, setVoicePreviewSound] = useState<any>(null);
  const [pendingVoiceUri, setPendingVoiceUri] = useState<string | null>(null);

  // --- Pinned message banner ---
  const [showPinnedBanner, setShowPinnedBanner] = useState(true);

  // --- Media gallery modal ---
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  // --- Attachment Modal State ---
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);

  if (!user) return null;

  // Open media gallery
  const openMediaGallery = async (startIndex = 0) => {
    await fetchMediaMessages();
    setSelectedMediaIndex(startIndex);
    setShowMediaGallery(true);
  };

  // Handler for attachment button
  const handleAttachment = () => {
    setShowAttachmentModal(true);
  };

  // Handler for voice button
  const handleVoice = async () => {
    try {
      if (typeof Audio === 'undefined' || !Audio.requestPermissionsAsync) {
        showToast('Voice recording not supported in this environment.');
        return;
      }
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showToast('Microphone permission denied.');
        return;
      }
      await startVoiceRecording();
    } catch (e) {
      showToast('Failed to start voice recording.');
    }
  };

  // --- Emoji Picker Logic ---
  const inputRef = useRef<any>(null);

  // Handler for emoji button
  const handleEmojiButton = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  // Handler for emoji selection
  const handleSelectEmoji = (emoji: string) => {
    // Insert emoji at cursor position
    if (inputRef.current && typeof inputRef.current.setNativeProps === 'function') {
      // If we have a ref to the TextInput, insert at cursor
      // But since message is controlled, just append for now
      setMessage((prev) => prev + emoji);
    } else {
      setMessage((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  // Add this function near other action menu logic
  const handleActionMenuSelect = (index: number, option: string) => {
    if (!actionMenuMsg) return;
    const msg = actionMenuMsg;
    const isOwn = msg.senderId === user.id;
    if (isOwn && option === 'Edit') {
      setEditingMsg(msg);
      setEditText(msg.content);
    } else if (isOwn && option === 'Delete') {
      handleDeleteMessage(msg);
    } else if (option === 'Copy') {
      Clipboard.setStringAsync(msg.content);
    } else if (option === 'Reply') {
      setReplyTo(msg);
    } else if (option === 'Star') {
      toggleStar(msg.id);
    } else if (option === 'Pin') {
      setPinned(msg);
    }
    setActionMenuVisible(false);
    setActionMenuMsg(null);
  };

  // Define normalizedReactions for thread context (place before thread modal render)
  const normalizedReactions = (msgId: string) => {
    const reactions = allReactions[msgId] || [];
    return Object.values(reactions.reduce((acc: any, r: any) => {
      if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, users: [], count: 0 };
      acc[r.emoji].users.push(r.user_id);
      acc[r.emoji].count++;
      return acc;
    }, {}));
  };

  // 1. Ensure all messages have reactions property before passing to MessageList
  const safeMessages = (searchMode ? searchResults : chatMessages).map(m => ({ ...m, reactions: m.reactions || [] }));

  // Add debug log for messages
  useEffect(() => {
    console.log('[Chat] Rendering', safeMessages.length, 'messages:', safeMessages.map(m => m.id));
  }, [safeMessages]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: themeColors.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      {/* Render background image if set */}
      {customization.background && typeof customization.background === 'string' && customization.background.startsWith('http') && (
        <Image source={{ uri: customization.background }} style={StyleSheet.absoluteFill} blurRadius={2} resizeMode="cover" />
      )}
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image source={headerAvatar && typeof headerAvatar === 'string' ? { uri: headerAvatar } : require('../../assets/images/default-avatar.png')} style={styles.avatar} />
          <View>
            <ThemedText style={styles.chatName}>{headerUser}</ThemedText>
            <ThemedText style={styles.lastSeen}>{lastSeen}</ThemedText>
          </View>
        </View>
        <TouchableOpacity
          onPress={async () => {
            const receiverId = chat.members.find(m => m.userId !== user.id)?.userId;
            if (receiverId) {
              await CallService.startCall(receiverId, 'audio');
              setActiveCall(CallService.currentCall);
              setShowCallModal(true);
            }
          }}
          style={styles.headerIconButton}
        >
          <Ionicons name="call-outline" size={22} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            const receiverId = chat.members.find(m => m.userId !== user.id)?.userId;
            if (receiverId) {
              await CallService.startCall(receiverId, 'video');
              setActiveCall(CallService.currentCall);
              setShowCallModal(true);
            }
          }}
          style={styles.headerIconButton}
        >
          <Ionicons name="videocam-outline" size={22} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHeaderMenu(true)} style={styles.headerIconButton}>
          <Ionicons name="ellipsis-vertical" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {/* Typing indicator */}
      {typing.length > 0 && (
        <View style={styles.typingIndicator}>
          <ThemedText>{typing.join(', ')} typing...</ThemedText>
          <TypingDots />
        </View>
      )}
      {/* Typing indicator avatars */}
      {typingAvatars.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingLeft: 12 }}>
          {typingAvatars.map((avatar, idx) => (
            <View key={idx} style={{ marginRight: 6 }}>
              <Animated.View style={{
                transform: [{ scale: 1 + 0.1 * Math.sin(Date.now() / 300 + idx) }],
                shadowColor: '#007AFF',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.18,
                shadowRadius: 4,
                elevation: 2,
              }}>
                <Image
                  source={avatar ? { uri: avatar } : require('../../assets/images/default-avatar.png')}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#eee', borderWidth: 2, borderColor: '#007AFF' }}
                />
              </Animated.View>
            </View>
          ))}
          <ThemedText style={{ color: '#007AFF', fontSize: 13, marginLeft: 2 }}>
            {typingNames.length === 1
              ? `${typingNames[0]} is typing...`
              : typingNames.length > 1
                ? `${typingNames.join(', ')} are typing...`
                : ''}
          </ThemedText>
        </View>
      )}
      {/* Pinned message */}
      {pinnedMessage && typeof pinnedMessage === 'object' && 'content' in pinnedMessage && (
        <TouchableOpacity onPress={() => {
          // Scroll to pinned message
          const idx = chatMessages.findIndex((msg: any) => msg.id === pinnedMessage.messageId || msg.id === pinnedMessage.id);
          if (idx !== -1 && flatListRef.current) {
            flatListRef.current.scrollToIndex({ index: idx, animated: true });
          }
        }} style={{ backgroundColor: '#fffbe6', padding: 10, borderBottomWidth: 1, borderColor: '#ffe58f', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pin" size={18} color="#faad14" style={{ marginRight: 8 }} />
            <ThemedText style={{ color: '#faad14', fontWeight: 'bold' }}>Pinned:</ThemedText>
            <ThemedText style={{ marginLeft: 6, maxWidth: 200 }} numberOfLines={1}>{pinnedMessage.content}</ThemedText>
          </View>
          {/* Unpin button (admin/owner only in group chats) */}
          {(!isGroup || ['admin', 'owner'].includes(myRole)) && (
            <TouchableOpacity onPress={() => setPinned(null)} style={{ marginLeft: 12 }}>
              <Ionicons name="close" size={18} color="#faad14" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
      {/* Pinned message banner */}
      {pinnedMessage && showPinnedBanner && (
        <View style={{ backgroundColor: '#fffbe6', borderBottomWidth: 1, borderBottomColor: '#ffe58f', padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ color: '#b8860b', fontWeight: 'bold' }}>📌 Pinned:</ThemedText>
            <ThemedText numberOfLines={2} style={{ color: '#b8860b' }}>{pinnedMessage.content}</ThemedText>
          </View>
          <TouchableOpacity onPress={() => { setShowPinnedBanner(false); setPinned(null); }} style={{ marginLeft: 12 }}>
            <Ionicons name="close-circle" size={22} color="#b8860b" />
          </TouchableOpacity>
        </View>
      )}
      {/* Polls */}
      {polls.length > 0 && (
        <View style={styles.pollsContainer}>
          {polls.map((poll: any) => (
            <View key={poll.id} style={styles.pollItem}>
              <ThemedText style={styles.pollQuestion}>{poll.question}</ThemedText>
              {poll.options.map((option: any) => (
                <TouchableOpacity 
                  key={option.id} 
                  style={styles.pollOption}
                  onPress={() => votePoll(poll.id, [option.id])}
                >
                  <ThemedText>{option.text} ({option.votes} votes)</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      )}
      {/* Messages List */}
      <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
        <MessageList
          ref={flatListRef}
          messages={safeMessages}
          userId={user.id}
          seenStatus={seenStatus}
          deliveredStatus={deliveredStatus}
          starredMessages={starredMessages}
          pinnedMessage={pinnedMessage}
          onReply={setReplyTo}
          onLongPress={showActionMenu}
          onStar={toggleStar}
          onPin={setPinned}
          onDelete={handleDeleteMessage}
          onForward={openForwardModal}
          onCopy={msg => Clipboard.setStringAsync(msg.content)}
          onReact={handleReact}
          onPress={openSeenModal}
          onSwipeReply={() => setReplyTo(item)}
          onPlayVoice={playVoiceWithEffect}
          onImagePress={handleImagePress}
          onFilePress={handleFilePress}
          firstUnreadMessageId={firstUnreadMessageId}
          searchTerm={searchActive ? searchTerm : ''}
          highlightedMessageId={highlightedMessageId}
          renderMessage={item => (
            <MessageBubble
              message={item}
              isOwn={item.senderId === user.id}
              showAvatar={true}
              onLongPress={showActionMenu}
              onReply={() => setReplyTo(item)}
              onStar={() => toggleStar(item.id)}
              onPin={() => setPinned(item)}
              onDelete={() => handleDeleteMessage(item)}
              onForward={() => openForwardModal(item)}
              onCopy={() => Clipboard.setStringAsync(item.content)}
              onReact={handleReact}
              seenStatus={seenStatus && seenStatus[item.id] ? seenStatus[item.id] : []}
              deliveredStatus={deliveredStatus && deliveredStatus[item.id] ? deliveredStatus[item.id] : []}
              replyTo={item.replyTo}
              reactions={normalizedReactions(item.id)}
              isStarred={starredMessages.includes(item.id)}
              isPinned={pinnedMessage && pinnedMessage.id === item.id}
              onPress={() => openSeenModal(item)}
              onSwipeReply={() => setReplyTo(item)}
              onPlayVoice={playVoiceWithEffect}
              onImagePress={handleImagePress}
              onFilePress={handleFilePress}
              searchTerm={searchActive ? searchTerm : ''}
              highlight={highlightedMessageId === item.id}
              onViewThread={handleViewThread}
            />
          )}
        />
        {safeMessages.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            <Ionicons name="chatbubble-ellipses-outline" size={64} color="#bbb" />
            <ThemedText style={{ fontSize: 18, color: '#bbb', marginTop: 12 }}>No messages yet. Say hello!</ThemedText>
          </View>
        )}
        {/* Floating Jump to Unread Button */}
        {/* (Button code removed) */}
      </Animated.View>
      {/* Reply bar */}
      <Animated.View style={{
        opacity: replyAnim,
        transform: [{ translateY: replyAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
      }}>
        <View style={styles.replyBar}>
          <ThemedText>Replying to: {(replyTo as any)?.content}</ThemedText>
          <TouchableOpacity onPress={() => setReplyTo(null)}><Ionicons name="close" size={18} /></TouchableOpacity>
        </View>
      </Animated.View>
      {/* Input Bar */}
      <InputBar
        message={message}
        onMessageChange={handleInputChange}
        onSend={handleSendMessage}
        onAttachment={handleAttachment}
        onVoice={handleVoice}
        onStopVoice={stopVoiceRecording}
        isVoiceRecording={isVoiceRecording}
        onEmoji={handleEmojiButton}
        onPoll={openPollModal}
        replyTo={replyTo ? { content: (replyTo as any).content } : undefined}
        onCancelReply={() => setReplyTo(null)}
        themeColors={themeColors}
        inputHeight={inputHeight}
        setInputHeight={setInputHeight}
        ref={inputRef}
      />
      {/* Poll Modal */}
      {showPollModal && (
        <Modal visible={showPollModal} animationType="slide" transparent onRequestClose={() => setShowPollModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Create Poll</ThemedText>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10 }}
                placeholder="Poll question"
                value={pollQuestion}
                onChangeText={setPollQuestion}
              />
              {pollOptions.map((opt, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <TextInput
                    style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, marginRight: 6 }}
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChangeText={text => handlePollOptionChange(text, idx)}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity onPress={() => removePollOption(idx)}>
                      <Ionicons name="remove-circle" size={22} color="#ff5252" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={addPollOption} style={{ marginVertical: 8 }}>
                <ThemedText style={{ color: '#007AFF' }}>+ Add Option</ThemedText>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setShowPollModal(false)} style={{ marginRight: 16 }}>
                  <ThemedText style={{ color: '#888' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCreatePoll(pollQuestion, pollOptions)}>
                  <ThemedText style={{ color: '#25d366', fontWeight: 'bold' }}>Create</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Giphy Modal */}
      {showGiphyModal && (
        <Modal visible={showGiphyModal} animationType="slide" transparent onRequestClose={() => setShowGiphyModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 16, padding: 18, maxHeight: 420 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Send a GIF</ThemedText>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10 }}
                placeholder="Search GIFs"
                value={giphySearch}
                onChangeText={handleGiphySearch}
              />
              <FlatList
                data={giphyResults}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleSelectGif(item)} style={{ marginRight: 10 }}>
                    <Image source={{ uri: item.url }} style={{ width: 100, height: 100, borderRadius: 10 }} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<ThemedText>No GIFs found.</ThemedText>}
              />
              <TouchableOpacity onPress={() => setShowGiphyModal(false)} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
                <ThemedText style={{ color: '#888' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <View style={styles.emojiPicker}><EmojiSelector onEmojiSelected={e => setMessage(m => m + e)} showSearchBar={false} showTabs={true} showHistory={true} /></View>
      )}
      {/* Giphy Picker (legacy, hidden) */}
      {showGiphy && (
        <View style={styles.giphyPicker}>{/* Giphy UI here */}</View>
      )}
      {/* Reaction bar */}
      {showReactionBar && reactionTargetMsg && (
        <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 24, padding: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 8 }}>
            {/* REACTION_EMOJIS.map((emoji: string) => ( */}
            {/*   <TouchableOpacity key={emoji} onPress={() => handleReact(reactionTargetMsg, emoji)} style={{ marginHorizontal: 6 }}> */}
            {/*     <ThemedText style={{ fontSize: 24 }}>{emoji}</ThemedText> */}
            {/*   </TouchableOpacity> */}
            {/* ))} */}
          </View>
        </View>
      )}

      {/* --- Edit message UI --- */}
      {editingMsg && (
        <Modal visible={!!editingMsg} animationType="slide" transparent onRequestClose={() => setEditingMsg(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Edit Message</ThemedText>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10 }}
                value={editText}
                onChangeText={setEditText}
                multiline
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setEditingMsg(null)} style={{ marginRight: 16 }}>
                  <ThemedText style={{ color: '#888' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitEditMessage}>
                  <ThemedText style={{ color: '#25d366', fontWeight: 'bold' }}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* --- Forward message modal --- */}
      {showForwardModal && (
        <Modal visible={showForwardModal} animationType="slide" transparent onRequestClose={() => setShowForwardModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 16, padding: 18, maxHeight: 420 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Forward Message</ThemedText>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 10, marginBottom: 10 }}
                placeholder="Search chats"
                value={forwardSearch}
                onChangeText={setForwardSearch}
              />
              <RNFlatList
                data={chatsList.filter(c => c.name.toLowerCase().includes(forwardSearch.toLowerCase()))}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => toggleSelectChat(item.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                    <Ionicons name={selectedChats.includes(item.id) ? 'checkbox' : 'square-outline'} size={22} color="#25d366" style={{ marginRight: 8 }} />
                    <ThemedText>{item.name}</ThemedText>
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 200, marginBottom: 10 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setShowForwardModal(false)} style={{ marginRight: 16 }}>
                  <ThemedText style={{ color: '#888' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitForward}>
                  <ThemedText style={{ color: '#25d366', fontWeight: 'bold' }}>Forward</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Read receipts modal */}
      {showSeenModal && seenModalMsg && (
        <Modal visible={showSeenModal} animationType="slide" transparent onRequestClose={() => setShowSeenModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>Seen By</ThemedText>
              <FlatList
                data={seenStatus[seenModalMsg.id]?.map(uid => getUserInfo(uid)) || []}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Image source={item.avatar ? { uri: item.avatar } : require('../../assets/images/default-avatar.png')} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: '#eee' }} />
                    <ThemedText>{item.displayName}</ThemedText>
                  </View>
                )}
                ListEmptyComponent={<ThemedText>No one has seen this yet.</ThemedText>}
                style={{ maxHeight: 200 }}
              />
              <TouchableOpacity onPress={() => setShowSeenModal(false)} style={{ alignSelf: 'flex-end', marginTop: 10 }}>
                <ThemedText style={{ color: '#888' }}>Close</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
      {showThemeModal && (
        <Modal visible={showThemeModal} animationType="slide" transparent onRequestClose={() => setShowThemeModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '96%', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 28, padding: 24, maxHeight: 700, shadowColor: '#00FFF7', shadowOpacity: 0.18, shadowRadius: 24, elevation: 12, overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
              <ThemedText style={{ fontWeight: 'bold', fontSize: 22, marginBottom: 14, textAlign: 'center', letterSpacing: 1 }}>Chat Theme & Background</ThemedText>
              <ThemedText style={{ marginBottom: 8, fontWeight: '600', fontSize: 15 }}>Theme</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }} contentContainerStyle={{ alignItems: 'center' }}>
                {builtInThemes.map(theme => (
                  <TouchableOpacity key={theme.key} style={{ marginRight: 18, borderWidth: selectedTheme === theme.key ? 3 : 0, borderColor: '#00FFF7', borderRadius: 16, padding: 6, backgroundColor: selectedTheme === theme.key ? 'rgba(0,255,247,0.08)' : 'transparent', alignItems: 'center', shadowColor: theme.colors[0], shadowOpacity: selectedTheme === theme.key ? 0.3 : 0, shadowRadius: 8, elevation: selectedTheme === theme.key ? 6 : 0 }} onPress={() => setSelectedTheme(theme.key)}>
                    <Image source={theme.preview} style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 4 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: theme.colors[0], marginRight: 4 }} />
                      <View style={{ width: 18, height: 18, borderRadius: 6, backgroundColor: theme.colors[1] }} />
                    </View>
                    <ThemedText style={{ fontSize: 13, textAlign: 'center', marginTop: 2 }}>{theme.name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ThemedText style={{ marginBottom: 8, fontWeight: '600', fontSize: 15 }}>Background</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }} contentContainerStyle={{ alignItems: 'center' }}>
                {builtInBackgrounds.map(bg => (
                  <TouchableOpacity key={bg.key} style={{ marginRight: 18, borderWidth: selectedBackground === bg.value ? 3 : 0, borderColor: '#FF00EA', borderRadius: 16, padding: 6, backgroundColor: selectedBackground === bg.value ? 'rgba(255,0,234,0.08)' : 'transparent', alignItems: 'center' }} onPress={() => setSelectedBackground(bg.value)}>
                    {bg.type === 'color' ? (
                      <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: bg.value }} />
                    ) : (
                      <Image source={bg.value} style={{ width: 48, height: 48, borderRadius: 12 }} />
                    )}
                    <ThemedText style={{ fontSize: 13, textAlign: 'center', marginTop: 2 }}>{bg.name}</ThemedText>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={{ marginRight: 10, borderWidth: 0, borderRadius: 12, padding: 6, alignItems: 'center' }} onPress={handlePickCustomImage}>
                  <Ionicons name="cloud-upload-outline" size={32} color="#888" />
                  <ThemedText style={{ fontSize: 13, textAlign: 'center' }}>Upload</ThemedText>
                </TouchableOpacity>
              </ScrollView>
              <ThemedText style={{ marginBottom: 8, fontWeight: '600', fontSize: 15 }}>Bubble Style</ThemedText>
              <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                {bubbleStyles.map(bs => (
                  <TouchableOpacity key={bs.key} style={{ marginRight: 18, borderWidth: selectedBubbleStyle === bs.key ? 2 : 0, borderColor: '#00FFF7', borderRadius: 8, padding: 6, backgroundColor: selectedBubbleStyle === bs.key ? 'rgba(0,255,247,0.08)' : 'transparent' }} onPress={() => setSelectedBubbleStyle(bs.key)}>
                    <ThemedText style={{ fontSize: 15 }}>{bs.name}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedText style={{ marginBottom: 8, fontWeight: '600', fontSize: 15 }}>Font</ThemedText>
              <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                {fontFamilies.map(ff => (
                  <TouchableOpacity key={ff} style={{ marginRight: 18, borderWidth: selectedFontFamily === ff ? 2 : 0, borderColor: '#FF00EA', borderRadius: 8, padding: 6, backgroundColor: selectedFontFamily === ff ? 'rgba(255,0,234,0.08)' : 'transparent' }} onPress={() => setSelectedFontFamily(ff)}>
                    <ThemedText style={{ fontSize: 15 }}>{ff}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedText style={{ marginBottom: 8, fontWeight: '600', fontSize: 15 }}>Font Size</ThemedText>
              <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                {fontSizes.map(fs => (
                  <TouchableOpacity key={fs} style={{ marginRight: 18, borderWidth: selectedFontSize === fs ? 2 : 0, borderColor: '#00FFF7', borderRadius: 8, padding: 6, backgroundColor: selectedFontSize === fs ? 'rgba(0,255,247,0.08)' : 'transparent' }} onPress={() => setSelectedFontSize(fs)}>
                    <ThemedText style={{ fontSize: 15 }}>{fs.charAt(0).toUpperCase() + fs.slice(1)}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Live preview */}
              <View style={{ marginVertical: 18, padding: 18, borderRadius: 18, backgroundColor: selectedBackground || '#f7f7f7', borderWidth: 1, borderColor: '#eee', shadowColor: '#00FFF7', shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 }}>
                <ThemedText style={{ color: selectedTheme === 'dark' ? '#fff' : '#222', fontFamily: selectedFontFamily, fontSize: selectedFontSize === 'small' ? 15 : selectedFontSize === 'large' ? 22 : 18, letterSpacing: 0.5 }}>
                  This is a preview of your chat theme!
                </ThemedText>
                <View style={{ marginTop: 12, flexDirection: 'row' }}>
                  <View style={{ flex: 1, backgroundColor: selectedTheme === 'dark' ? '#232526' : selectedTheme === 'gradient' ? 'linear-gradient(90deg, #ff9966, #ff5e62)' : selectedTheme === 'pastel' ? '#a8edea' : selectedTheme === 'glass' ? 'rgba(255,255,255,0.7)' : selectedTheme === 'neon' ? '#00FFF7' : selectedTheme === 'cyberpunk' ? '#ff00ea' : '#25d366', borderRadius: selectedBubbleStyle === 'rounded' ? 18 : 6, padding: 12, shadowColor: selectedTheme === 'neon' ? '#00FFF7' : selectedTheme === 'cyberpunk' ? '#ff00ea' : '#25d366', shadowOpacity: 0.18, shadowRadius: 8, elevation: 2 }}>
                    <ThemedText style={{ color: selectedTheme === 'dark' ? '#fff' : selectedTheme === 'neon' ? '#232526' : selectedTheme === 'cyberpunk' ? '#fff' : '#222', fontFamily: selectedFontFamily }}>Hello! 👋</ThemedText>
                  </View>
                </View>
              </View>
              {/* Save/Cancel */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                <TouchableOpacity onPress={() => setShowThemeModal(false)} style={{ marginRight: 18 }}>
                  <ThemedText style={{ color: '#888', fontSize: 16 }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveTheme} disabled={!canEditTheme || uploading} style={{ opacity: canEditTheme && !uploading ? 1 : 0.5 }}>
                  <ThemedText style={{ color: '#00FFF7', fontWeight: 'bold', fontSize: 16 }}>{uploading ? 'Saving...' : 'Save'}</ThemedText>
                </TouchableOpacity>
              </View>
              {!canEditTheme && (
                <ThemedText style={{ color: '#888', marginTop: 10, fontSize: 13, textAlign: 'center' }}>Only admins/owners can change the theme in group chats.</ThemedText>
              )}
            </View>
          </View>
        </Modal>
      )}
      {showGroupInfo && (
        <Modal visible={showGroupInfo} animationType="slide" transparent onRequestClose={() => setShowGroupInfo(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 18, padding: 20, maxHeight: 600 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <ThemedText style={{ fontWeight: 'bold', fontSize: 20 }}>Group Info</ThemedText>
                <TouchableOpacity onPress={() => setShowGroupInfo(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              {/* GroupManager handles member management */}
              <GroupManager groupId={chat.id} />
            </View>
          </View>
        </Modal>
      )}
      {showMediaModal && (
        <Modal visible={showMediaModal} animationType="slide" transparent onRequestClose={() => setShowMediaModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '98%', backgroundColor: '#fff', borderRadius: 18, padding: 10, maxHeight: Dimensions.get('window').height * 0.85 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <ThemedText style={{ fontWeight: 'bold', fontSize: 20 }}>Media Gallery</ThemedText>
                <TouchableOpacity onPress={() => setShowMediaModal(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={mediaMessages}
                numColumns={3}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{ flex: 1 / 3, aspectRatio: 1, margin: 4, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => { setSelectedMedia(item); setShowMediaPreview(true); }}
                  >
                    {item.type === 'image' && (
                      <Image source={item.attachments?.[0]?.url && typeof item.attachments[0].url === 'string' ? { uri: item.attachments[0].url } : item.content && typeof item.content === 'string' ? { uri: item.content } : undefined} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    )}
                    {item.type === 'video' && (
                      <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="play-circle" size={48} color="#007AFF" />
                        <Image source={{ uri: item.attachments?.[0]?.thumbnail || item.attachments?.[0]?.url }} style={{ width: '100%', height: '100%', position: 'absolute', opacity: 0.7 }} resizeMode="cover" />
                      </View>
                    )}
                    {item.type === 'file' && (
                      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="document-outline" size={36} color="#888" />
                        <ThemedText style={{ fontSize: 12, marginTop: 4 }}>{item.attachments?.[0]?.name || 'File'}</ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<ThemedText style={{ textAlign: 'center', marginTop: 32 }}>No media found in this chat.</ThemedText>}
              />
            </View>
            {/* Full-screen preview for images/videos */}
            {showMediaPreview && selectedMedia && (
              <Modal visible={showMediaPreview} animationType="fade" transparent onRequestClose={() => setShowMediaPreview(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setShowMediaPreview(false)} style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}>
                    <Ionicons name="close" size={32} color="#fff" />
                  </TouchableOpacity>
                  {selectedMedia.type === 'image' && (
                    <Image source={selectedMedia.attachments?.[0]?.url && typeof selectedMedia.attachments[0].url === 'string' ? { uri: selectedMedia.attachments[0].url } : selectedMedia.content && typeof selectedMedia.content === 'string' ? { uri: selectedMedia.content } : undefined} style={{ width: '90%', height: '70%', borderRadius: 12 }} resizeMode="contain" />
                  )}
                  {selectedMedia.type === 'video' && (
                    <Video source={{ uri: selectedMedia.attachments?.[0]?.url }} style={{ width: '90%', height: '70%', borderRadius: 12 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                  )}
                  {selectedMedia.type === 'file' && (
                    <TouchableOpacity onPress={() => {/* download/open logic */}} style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="document-outline" size={64} color="#fff" />
                      <ThemedText style={{ color: '#fff', fontSize: 18, marginTop: 12 }}>{selectedMedia.attachments?.[0]?.name || 'File'}</ThemedText>
                      <ThemedText style={{ color: '#fff', fontSize: 14, marginTop: 4 }}>Tap to download/open</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>
              </Modal>
            )}
          </View>
        </Modal>
      )}
      {showStarredModal && (
        <Modal visible={showStarredModal} animationType="slide" transparent onRequestClose={() => setShowStarredModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 18, padding: 20, maxHeight: 600 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <ThemedText style={{ fontWeight: 'bold', fontSize: 20 }}>Starred Messages</ThemedText>
                <TouchableOpacity onPress={() => setShowStarredModal(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={chatMessages.filter((msg: any) => starredMessages.includes(msg.id))}
                keyExtractor={(item, index) => {
                  if (!item.id) {
                    console.warn('Starred message missing id:', item);
                    return `starred-${index}`;
                  }
                  return item.id;
                }}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => {
                    setShowStarredModal(false);
                    const idx = chatMessages.findIndex((msg: any) => msg.id === item.id);
                    if (idx !== -1 && flatListRef.current) {
                      flatListRef.current.scrollToIndex({ index: idx, animated: true });
                    }
                  }} style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
                    <ThemedText numberOfLines={2}>{item.content}</ThemedText>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<ThemedText style={{ textAlign: 'center', marginTop: 32 }}>No starred messages.</ThemedText>}
              />
            </View>
          </View>
        </Modal>
      )}
      {showMiniFeatures && (
        <Modal visible={showMiniFeatures} animationType="slide" transparent onRequestClose={() => setShowMiniFeatures(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} onPress={() => setShowMiniFeatures(false)}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, minHeight: 180, elevation: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
                <TouchableOpacity onPress={() => { setShowMiniFeatures(false); setShowEmojiPicker(true); }} style={styles.featureButton}>
                  <Ionicons name="happy-outline" size={28} color="#FFB300" />
                  <ThemedText style={styles.featureLabel}>Emoji</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowMiniFeatures(false); openGiphyModal(); }} style={styles.featureButton}>
                  <Ionicons name="gift-outline" size={28} color="#7C4DFF" />
                  <ThemedText style={styles.featureLabel}>GIF</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowMiniFeatures(false); openPollModal(); }} style={styles.featureButton}>
                  <Ionicons name="bar-chart-outline" size={28} color="#00BFAE" />
                  <ThemedText style={styles.featureLabel}>Poll</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setShowMiniFeatures(false); handlePickFile(); }} style={styles.featureButton}>
                  <Ionicons name="attach" size={28} color="#FF6B35" />
                  <ThemedText style={styles.featureLabel}>File</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showHeaderMenu && (
        <Modal visible={showHeaderMenu} animationType="fade" transparent onRequestClose={() => setShowHeaderMenu(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} onPress={() => setShowHeaderMenu(false)}>
            <View style={{ position: 'absolute', top: 60, right: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, minWidth: 180, elevation: 8 }}>
              <TouchableOpacity style={{ paddingVertical: 10 }} onPress={() => {/* TODO: Block logic */}}>
                <Ionicons name="ban" size={18} color="#FF4444" style={{ marginRight: 8 }} />
                <ThemedText style={{ color: '#FF4444', marginLeft: 8 }}>Block</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 10 }} onPress={() => { setShowThemeModal(true); setShowHeaderMenu(false); }}>
                <Ionicons name="color-palette-outline" size={18} color="#007AFF" style={{ marginRight: 8 }} />
                <ThemedText style={{ color: '#007AFF', marginLeft: 8 }}>Chat Theme</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 10 }} onPress={() => {/* TODO: More settings */}}>
                <Ionicons name="settings-outline" size={18} color="#888" style={{ marginRight: 8 }} />
                <ThemedText style={{ color: '#888', marginLeft: 8 }}>More Settings</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {showCallModal && activeCall && (
        <CallInterface
          visible={showCallModal}
          call={activeCall}
          onClose={() => setShowCallModal(false)}
        />
      )}
      <ActionMenu
        visible={actionMenuVisible}
        options={actionMenuOptions}
        onSelect={handleActionMenuSelect}
        onClose={() => { setActionMenuVisible(false); setActionMenuMsg(null); }}
      />
      {/* Image Viewer Modal */}
      <ImageViewing
        images={mediaImages.map(uri => ({ uri }))}
        imageIndex={imageViewerIndex}
        visible={imageViewerVisible}
        onRequestClose={() => setImageViewerVisible(false)}
      />
      {/* File Modal */}
      <Modal
        visible={fileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFileModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, minWidth: 260 }}>
            <ThemedText style={{ fontWeight: 'bold', fontSize: 18 }}>File Preview</ThemedText>
            <ThemedText style={{ marginTop: 8 }}>{fileModalData?.name}</ThemedText>
            <Button title="Open" onPress={() => fileModalData && Linking.openURL(fileModalData.url)} />
            <Button title="Close" onPress={() => setFileModalVisible(false)} color="#888" />
          </View>
        </View>
      </Modal>
      {/* Search Bar */}
      <View style={{ padding: 8, backgroundColor: '#f7f7f7', borderBottomWidth: 1, borderColor: '#eee' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12 }}>
          <Ionicons name="search" size={20} color="#888" style={{ marginRight: 6 }} />
          <TextInput
            style={{ flex: 1, height: 36, fontSize: 16 }}
            placeholder="Search messages..."
            value={searchText}
            onChangeText={text => {
              setSearchText(text);
              setSearchMode(true);
              setSearch(text);
              setHighlightedResultIdx(0);
            }}
            onFocus={() => setSearchMode(true)}
            onBlur={() => { if (!searchText) setSearchMode(false); }}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchText(''); setSearchMode(false); setSearch(''); }}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        {searchActive && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setHighlightedResultIdx(idx => (idx - 1 + searchResults.length) % searchResults.length)}
              style={{ padding: 6, marginHorizontal: 8 }}
              disabled={searchResults.length === 0}
            >
              <Ionicons name="chevron-up" size={22} color="#007AFF" />
            </TouchableOpacity>
            <ThemedText style={{ fontSize: 14, color: '#007AFF', fontWeight: 'bold' }}>{highlightedResultIdx + 1} / {searchResults.length}</ThemedText>
            <TouchableOpacity
              onPress={() => setHighlightedResultIdx(idx => (idx + 1) % searchResults.length)}
              style={{ padding: 6, marginHorizontal: 8 }}
              disabled={searchResults.length === 0}
            >
              <Ionicons name="chevron-down" size={22} color="#007AFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {/* Thread Modal */}
      <Modal visible={threadModalVisible} animationType="slide" onRequestClose={() => setThreadModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
            <TouchableOpacity onPress={() => setThreadModalVisible(false)} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <ThemedText style={{ fontWeight: 'bold', fontSize: 17 }}>Thread</ThemedText>
          </View>
          {/* Define normalizedReactions for thread context */}
          {(() => {
            // For thread root message and replies, normalize reactions
            let threadReactions: any[] = [];
            if (threadRootMessage && allReactions[threadRootMessage.id]) threadReactions = allReactions[threadRootMessage.id];
            // For replies, collect all reactions for each reply
            const normalizedReactions = (msgId: string) => {
              const reactions = allReactions[msgId] || [];
              return Object.values(reactions.reduce((acc: any, r: any) => {
                if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, users: [], count: 0 };
                acc[r.emoji].users.push(r.user_id);
                acc[r.emoji].count++;
                return acc;
              }, {}));
            };
            // Patch MessageBubble usages below to use normalizedReactions(msg.id)
            // This IIFE is just to scope the helpers
            return null;
          })()}
          {threadRootMessage && (
            <View style={{ padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' }}>
              <MessageBubble
                message={threadRootMessage}
                isOwn={threadRootMessage.senderId === user.id}
                onLongPress={showActionMenu}
                onReply={() => setReplyTo(threadRootMessage)}
                onStar={() => toggleStar(threadRootMessage.id)}
                onPin={() => setPinned(threadRootMessage)}
                onDelete={() => handleDeleteMessage(threadRootMessage)}
                onForward={() => openForwardModal(threadRootMessage)}
                onCopy={() => Clipboard.setStringAsync(threadRootMessage.content)}
                onReact={handleReact}
                seenStatus={seenStatus && seenStatus[threadRootMessage.id]}
                deliveredStatus={deliveredStatus && deliveredStatus[threadRootMessage.id]}
                replyTo={threadRootMessage.replyTo}
                reactions={normalizedReactions(threadRootMessage.id)}
                isStarred={starredMessages.includes(threadRootMessage.id)}
                isPinned={pinnedMessage && pinnedMessage.id === threadRootMessage.id}
                onPress={() => openSeenModal(threadRootMessage)}
                onSwipeReply={() => setReplyTo(threadRootMessage)}
                onPlayVoice={playVoiceWithEffect}
                onImagePress={handleImagePress}
                onFilePress={handleFilePress}
              />
            </View>
          )}
          <FlatList
            data={threadReplies}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                isOwn={item.senderId === user.id}
                onLongPress={showActionMenu}
                onReply={() => setReplyTo(item)}
                onStar={() => toggleStar(item.id)}
                onPin={() => setPinned(item)}
                onDelete={() => handleDeleteMessage(item)}
                onForward={() => openForwardModal(item)}
                onCopy={() => Clipboard.setStringAsync(item.content)}
                onReact={handleReact}
                seenStatus={seenStatus && seenStatus[item.id]}
                deliveredStatus={deliveredStatus && deliveredStatus[item.id]}
                replyTo={item.replyTo}
                reactions={normalizedReactions(item.id)}
                isStarred={starredMessages.includes(item.id)}
                isPinned={pinnedMessage && pinnedMessage.id === item.id}
                onPress={() => openSeenModal(item)}
                onSwipeReply={() => setReplyTo(item)}
                onPlayVoice={playVoiceWithEffect}
                onImagePress={handleImagePress}
                onFilePress={handleFilePress}
              />
            )}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={<ThemedText style={{ color: '#888', textAlign: 'center', marginTop: 32 }}>No replies yet.</ThemedText>}
          />
          {/* Thread reply input */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fff' }}>
            <TextInput
              style={{ flex: 1, height: 40, borderRadius: 20, backgroundColor: '#f2f2f7', paddingHorizontal: 14, fontSize: 16 }}
              placeholder="Reply in thread..."
              value={threadReply}
              onChangeText={setThreadReply}
              onSubmitEditing={handleSendThreadReply}
              returnKeyType="send"
            />
            <TouchableOpacity onPress={handleSendThreadReply} style={{ marginLeft: 8, backgroundColor: '#25d366', borderRadius: 20, padding: 10 }}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Reaction Emoji Picker Modal */}
      {showReactionBar && reactionTargetMsg && (
        <Modal visible={showReactionBar} animationType="fade" transparent onRequestClose={() => setShowReactionBar(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} activeOpacity={1} onPress={() => setShowReactionBar(false)}>
            <View style={{ position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center', zIndex: 20 }}>
              <View style={{ width: 320, maxHeight: 340, backgroundColor: '#fff', borderRadius: 18, padding: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 12 }}>
                <EmojiSelector
                  onEmojiSelected={handleSelectReactionEmoji}
                  showSearchBar={true}
                  showTabs={true}
                  showHistory={true}
                  columns={8}
                  category={null}
                  theme={{ container: { backgroundColor: '#fff' } }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {/* Voice Effect Modal */}
      <Modal visible={showVoiceEffectModal} animationType="slide" transparent onRequestClose={() => setShowVoiceEffectModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: 320 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Choose Voice Effect</Text>
            {VOICE_EFFECTS.map(effect => (
              <TouchableOpacity
                key={effect.key}
                style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6, backgroundColor: selectedVoiceEffect.key === effect.key ? '#e0e7ff' : '#f7f7f7', borderRadius: 8, padding: 10 }}
                onPress={() => setSelectedVoiceEffect(effect)}
                onLongPress={() => handleVoiceEffectPreview(effect)}
              >
                <Text style={{ fontSize: 16, flex: 1 }}>{effect.label}</Text>
                {selectedVoiceEffect.key === effect.key && <Ionicons name="checkmark-circle" size={20} color="#007AFF" />}
                <TouchableOpacity onPress={() => handleVoiceEffectPreview(effect)} style={{ marginLeft: 12 }}>
                  <Ionicons name="play" size={20} color="#007AFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
              <TouchableOpacity onPress={() => setShowVoiceEffectModal(false)} style={{ marginRight: 18 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleVoiceEffectSend}>
                <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 16 }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Media Gallery Modal */}
      <Modal visible={showMediaGallery} animationType="slide" onRequestClose={() => setShowMediaGallery(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#111' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#222' }}>
            <TouchableOpacity onPress={() => setShowMediaGallery(false)} style={{ marginRight: 12 }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Media Gallery</ThemedText>
          </View>
          <FlatList
            data={mediaMessages}
            keyExtractor={item => item.id}
            numColumns={3}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={{ flex: 1 / 3, aspectRatio: 1, margin: 4, borderRadius: 10, overflow: 'hidden', backgroundColor: '#222' }}
                onPress={() => { setSelectedMediaIndex(index); setShowMediaPreview(true); }}
                activeOpacity={0.85}
              >
                {item.type === 'image' && (
                  <Image source={{ uri: item.content }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                )}
                {item.type === 'video' && (
                  <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
                    <Ionicons name="videocam" size={32} color="#fff" />
                  </View>
                )}
                {item.type === 'file' && (
                  <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }}>
                    <Ionicons name="document" size={32} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
          {/* Fullscreen preview for images */}
          {showMediaPreview && mediaMessages[selectedMediaIndex] && mediaMessages[selectedMediaIndex].type === 'image' && (
            <Modal visible={showMediaPreview} animationType="fade" transparent onRequestClose={() => setShowMediaPreview(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowMediaPreview(false)} style={{ position: 'absolute', top: 40, right: 24, zIndex: 10 }}>
                  <Ionicons name="close-circle" size={36} color="#fff" />
                </TouchableOpacity>
                <Image source={{ uri: mediaMessages[selectedMediaIndex].content }} style={{ width: '90%', height: '70%', borderRadius: 16 }} resizeMode="contain" />
              </View>
            </Modal>
          )}
        </SafeAreaView>
      </Modal>
      {/* Attachment Modal */}
      <Modal visible={showAttachmentModal} animationType="slide" transparent onRequestClose={() => setShowAttachmentModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} onPress={() => setShowAttachmentModal(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 24, minHeight: 180, elevation: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => { setShowAttachmentModal(false); handlePickImage(); }} style={styles.featureButton}>
                <Ionicons name="image-outline" size={28} color="#007AFF" />
                <ThemedText style={styles.featureLabel}>Image</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAttachmentModal(false); handlePickFile(); }} style={styles.featureButton}>
                <Ionicons name="attach" size={28} color="#FF6B35" />
                <ThemedText style={styles.featureLabel}>File</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <Modal visible={showEmojiPicker} animationType="slide" transparent onRequestClose={() => setShowEmojiPicker(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} onPress={() => setShowEmojiPicker(false)}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 12, minHeight: 320, elevation: 12 }}>
              <EmojiSelector
                onEmojiSelected={handleSelectEmoji}
                showSearchBar={true}
                showTabs={true}
                showHistory={true}
                showSectionTitles={false}
                columns={8}
                category={undefined}
                theme={'light'}
                style={{ height: 300 }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButton: { marginRight: 12 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, backgroundColor: '#eee' },
  chatName: { fontWeight: 'bold', fontSize: 16 },
  lastSeen: { fontSize: 12, color: '#888' },
  bgButton: { marginLeft: 8 },
  typingIndicator: { padding: 8, backgroundColor: '#f0f0f0' },
  pinnedMessage: { backgroundColor: '#fffbe6', padding: 8, borderBottomWidth: 1, borderBottomColor: '#ffe58f', flexDirection: 'row', alignItems: 'center' },
  messageBubble: { borderRadius: 16, padding: 10, marginVertical: 4, marginHorizontal: 8, maxWidth: '80%' },
  myMessage: { backgroundColor: '#d1f5d3', alignSelf: 'flex-end' },
  otherMessage: { backgroundColor: '#e5e5ea', alignSelf: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  reactionsRow: { flexDirection: 'row', marginRight: 8 },
  replyContainer: { borderLeftWidth: 2, borderLeftColor: '#007AFF', paddingLeft: 6, marginBottom: 4 },
  replyText: { fontSize: 12, color: '#007AFF' },
  inputBar: { 
    padding: 10, 
    borderTopWidth: 0, 
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  inputRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  input: { 
    flex: 1, 
    minHeight: 40, 
    maxHeight: 120, 
    borderRadius: 20,
    backgroundColor: '#f2f2f7', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    fontSize: 16,
    marginRight: 6, 
    textAlignVertical: 'center',
  },
  sendButton: { 
    backgroundColor: '#25d366', // WhatsApp send green
    borderRadius: 20, 
    padding: 10,
    marginLeft: 4,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButton: { 
    marginHorizontal: 2, 
    padding: 6, 
    borderRadius: 16,
    backgroundColor: '#f2f2f7',
  },
  emojiPicker: { position: 'absolute', bottom: 60, left: 0, right: 0, height: 300, backgroundColor: '#fff', zIndex: 10 },
  giphyPicker: { position: 'absolute', bottom: 60, left: 0, right: 0, height: 300, backgroundColor: '#fff', zIndex: 10 },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7ff', padding: 6, borderLeftWidth: 4, borderLeftColor: '#1890ff' },
  muteButton: { marginLeft: 8 },
  pollsContainer: { padding: 8, backgroundColor: '#f0f0f0' },
  pollItem: { marginBottom: 8, padding: 8, backgroundColor: '#fff', borderRadius: 8 },
  pollQuestion: { fontWeight: 'bold', marginBottom: 4 },
  pollOption: { padding: 4, marginVertical: 2, backgroundColor: '#f8f8f8', borderRadius: 4 },
  unpinButton: { position: 'absolute', right: 8, top: 8 },
  bubbleModern: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: '#dcf8c6', // WhatsApp green
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  bubbleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 6,
    backgroundColor: '#eee',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  messageRowMine: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleSender: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateHeaderText: {
    backgroundColor: '#e0e0e0',
    color: '#555',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  swipeActionsContainer: {
    position: 'absolute',
    right: -90,
    top: 0,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  swipeActionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  infoButton: {
    marginLeft: 8,
  },
  mediaButton: {
    marginLeft: 8,
  },
  starredButton: {
    marginLeft: 8,
  },
  featureButton: { alignItems: 'center', marginHorizontal: 12 },
  featureLabel: { fontSize: 13, marginTop: 6, color: '#333', fontWeight: '500' },
  headerIconButton: { marginLeft: 10, padding: 6, borderRadius: 16, backgroundColor: '#f2f2f7' },
  jumpToUnreadButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 32,
    overflow: 'hidden',
  },
  jumpToUnreadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 32,
  },
  jumpToUnreadText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
}); 