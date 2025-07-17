import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useChatBackground(chatId: string) {
  const [background, setBackgroundState] = useState<string>('');
  // Fetch background on mount
  useEffect(() => {
    if (!chatId) return;
    (async () => {
      const { data, error } = await supabase
        .from('chats')
        .select('customization')
        .eq('id', chatId)
        .single();
      if (!error && data?.customization?.background) {
        setBackgroundState(data.customization.background);
      }
    })();
  }, [chatId]);

  // Setter to update background in Supabase and local state
  const setBackground = useCallback(async (bg: string) => {
    setBackgroundState(bg);
    await supabase
      .from('chats')
      .update({ customization: { background: bg } })
      .eq('id', chatId);
  }, [chatId]);

  return [background, setBackground] as const;
}

export function useTypingStatus(chatId: string, userId?: string) {
  const [typing, setTyping] = useState<string[]>([]);

  // Subscribe to typing_status changes for this chat
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel('typing_status_' + chatId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_status', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          // Refetch typing users
          fetchTyping();
        }
      )
      .subscribe();
    fetchTyping();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [chatId]);

  const fetchTyping = useCallback(async () => {
    const { data, error } = await supabase
      .from('typing_status')
      .select('user_id, is_typing')
      .eq('chat_id', chatId);
    if (!error && data) {
      setTyping(data.filter((row: any) => row.is_typing).map((row: any) => row.user_id));
    }
  }, [chatId]);

  // Set typing status for current user
  const setTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!chatId || !userId) return;
    await supabase
      .from('typing_status')
      .upsert({ chat_id: chatId, user_id: userId, is_typing: isTyping, updated_at: new Date().toISOString() }, { onConflict: 'chat_id,user_id' });
  }, [chatId, userId]);

  return { typing, setTypingStatus };
}

export function useSeenDelivered(chatId: string, userId?: string) {
  const [seenStatus, setSeenStatus] = useState<{ [messageId: string]: string[] }>({});
  const [deliveredStatus, setDeliveredStatus] = useState<{ [messageId: string]: string[] }>({});

  // Subscribe to message_status changes for this chat
  useEffect(() => {
    if (!chatId) return;
    const channel = supabase
      .channel('message_status_' + chatId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_status', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          fetchStatuses();
        }
      )
      .subscribe();
    fetchStatuses();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const fetchStatuses = useCallback(async () => {
    if (!chatId) return;
    const { data, error } = await supabase
      .from('message_status')
      .select('message_id, user_id, status')
      .eq('chat_id', chatId);
    if (!error && data) {
      const seen: { [messageId: string]: string[] } = {};
      const delivered: { [messageId: string]: string[] } = {};
      data.forEach((row: any) => {
        if (row.status === 'seen') {
          if (!seen[row.message_id]) seen[row.message_id] = [];
          seen[row.message_id].push(row.user_id);
        }
        if (row.status === 'delivered') {
          if (!delivered[row.message_id]) delivered[row.message_id] = [];
          delivered[row.message_id].push(row.user_id);
        }
      });
      setSeenStatus(seen);
      setDeliveredStatus(delivered);
      console.log('[useSeenDelivered] seen:', seen, 'delivered:', delivered);
    } else {
      console.log('[useSeenDelivered] error:', error);
    }
  }, [chatId]);

  // Update message status (delivered/seen)
  const updateMessageStatus = useCallback(async (messageId: string, status: 'delivered' | 'seen') => {
    if (!userId) return;
    await supabase
      .from('message_status')
      .upsert({ message_id: messageId, user_id: userId, status, updated_at: new Date().toISOString(), chat_id: chatId }, { onConflict: 'message_id,user_id' });
  }, [userId, chatId]);

  return { seenStatus, deliveredStatus, updateMessageStatus };
}

export function useStarredMessages(chatId: string, userId?: string) {
  const [starredMessages, setStarredMessages] = useState<string[]>([]);
  // Subscribe to starred_messages changes for this chat and user
  useEffect(() => {
    if (!chatId || !userId) return;
    const channel = supabase
      .channel('starred_messages_' + chatId + '_' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'starred_messages', filter: `user_id=eq.${userId}` },
        (payload) => {
          fetchStarred();
        }
      )
      .subscribe();
    fetchStarred();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, userId]);
  const fetchStarred = useCallback(async () => {
    if (!chatId || !userId) return;
    const { data, error } = await supabase
      .from('starred_messages')
      .select('message_id')
      .eq('user_id', userId)
      .eq('chat_id', chatId);
    if (!error && data) {
      setStarredMessages(data.map((row: any) => row.message_id));
      console.log('[useStarredMessages] starred:', data.map((row: any) => row.message_id));
    } else {
      console.log('[useStarredMessages] error:', error);
    }
  }, [chatId, userId]);
  // Toggle star/unstar
  const toggleStar = useCallback(async (messageId: string) => {
    if (!userId) return;
    if (starredMessages.includes(messageId)) {
      await supabase
        .from('starred_messages')
        .delete()
        .eq('user_id', userId)
        .eq('message_id', messageId);
    } else {
      await supabase
        .from('starred_messages')
        .upsert({ message_id: messageId, user_id: userId, chat_id: chatId, created_at: new Date().toISOString() }, { onConflict: 'message_id,user_id' });
    }
    fetchStarred();
  }, [userId, chatId, starredMessages, fetchStarred]);
  return { starredMessages, toggleStar };
}

export function usePinnedMessage(chatId: string, userId?: string) {
  const [pinnedMessage, setPinnedMessage] = useState<any>(null);
  useEffect(() => {
    if (!chatId || !userId) return;
    const channel = supabase
      .channel('pinned_message_' + chatId + '_' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          fetchPinned();
        }
      )
      .subscribe();
    fetchPinned();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, userId]);
  const fetchPinned = useCallback(async () => {
    if (!chatId) return;
    const { data, error } = await supabase
      .from('chat_members')
      .select('pinned_message_id')
      .eq('chat_id', chatId)
      .single();
    if (!error && data && data.pinned_message_id) {
      const { data: msg, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', data.pinned_message_id)
        .single();
      if (!msgError && msg) setPinnedMessage(msg);
      else setPinnedMessage(null);
      console.log('[usePinnedMessage] pinned:', msg);
    } else {
      setPinnedMessage(null);
      console.log('[usePinnedMessage] no pinned message');
    }
  }, [chatId]);
  const setPinned = useCallback(async (messageId: string | null) => {
    if (!chatId || !userId) return;
    await supabase
      .from('chat_members')
      .update({ pinned_message_id: messageId })
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    fetchPinned();
  }, [chatId, userId, fetchPinned]);
  return { pinnedMessage, setPinned };
}

export function useChatSearch(chatId: string, userId?: string) {
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState<'all' | 'images' | 'files' | 'links' | 'starred'>('all');
  const search = useCallback(async (text: string, filterType: typeof filter = 'all') => {
    if (!chatId) return;
    let query = supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId);
    if (text) {
      query = query.ilike('content', `%${text}%`);
    }
    if (filterType === 'images') {
      query = query.eq('type', 'image');
    } else if (filterType === 'files') {
      query = query.eq('type', 'file');
    } else if (filterType === 'links') {
      query = query.filter('content', 'ilike', '%http%');
    } else if (filterType === 'starred' && userId) {
      const { data, error } = await supabase
        .from('starred_messages')
        .select('message_id')
        .eq('user_id', userId)
        .eq('chat_id', chatId);
      if (!error && data) {
        const ids = data.map((row: any) => row.message_id);
        query = query.in('id', ids);
      }
    }
    const { data, error } = await query;
    if (!error && data) {
      setSearchResults(data);
      console.log('[useChatSearch] results:', data);
    } else {
      console.log('[useChatSearch] error:', error);
    }
  }, [chatId, userId]);
  const setSearch = (text: string, filterType: typeof filter = 'all') => {
    setSearchText(text);
    setFilter(filterType);
    search(text, filterType);
  };
  return { searchResults, search, setSearch };
}

export function useVoiceMessages(chatId: string, userId?: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<any>(null);
  const [sound, setSound] = useState<any>(null);
  const recordVoice = useCallback(async () => {
    try {
      setIsRecording(true);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) throw new Error('Permission denied');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      console.log('[useVoiceMessages] started recording');
    } catch (e) {
      setIsRecording(false);
      console.log('[useVoiceMessages] error:', e);
    }
  }, []);
  const stopRecording = useCallback(async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri && chatId && userId) {
      const fileName = `voice_${Date.now()}.m4a`;
      const fileUri = uri;
      const file = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
      const blob = Buffer.from(file, 'base64');
      const publicUrl = await (await import('../lib/supabase')).uploadFile(blob, `meaz-storage/voice/${chatId}/${fileName}`);
      await (await import('../store/chatStore')).useChatStore.getState().sendMessage(chatId, '', 'voice', false);
      await supabase
        .from('messages')
        .update({ audio_url: publicUrl })
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(1);
      console.log('[useVoiceMessages] uploaded voice message:', publicUrl);
    }
  }, [recording, chatId, userId]);
  const playVoice = useCallback(async (audioUrl: string) => {
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }
    const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
    setSound(newSound);
    await newSound.playAsync();
    console.log('[useVoiceMessages] playing:', audioUrl);
  }, [sound]);
  const uploadVoice = useCallback(async (uri: string) => {
    if (!uri || !chatId || !userId) return;
    const fileName = `voice_${Date.now()}.m4a`;
    const file = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const blob = Buffer.from(file, 'base64');
    const publicUrl = await (await import('../lib/supabase')).uploadFile(blob, `meaz-storage/voice/${chatId}/${fileName}`);
    await (await import('../store/chatStore')).useChatStore.getState().sendMessage(chatId, '', 'voice', false);
    await supabase
      .from('messages')
      .update({ audio_url: publicUrl })
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(1);
    console.log('[useVoiceMessages] uploaded custom voice:', publicUrl);
  }, [chatId, userId]);
  return { playVoice, recordVoice, stopRecording, uploadVoice, isRecording };
}

const GIPHY_API_KEY = 'dc6zaTOxFJmzC'; // Replace with your own key for production

export function useGiphy() {
  const [giphyResults, setGiphyResults] = useState<any[]>([]);
  const [selectedGif, setSelectedGif] = useState<any>(null);
  const searchGiphy = useCallback(async (query: string) => {
    if (!query) return;
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=25&offset=0&rating=G&lang=en`;
    const res = await fetch(url);
    const json = await res.json();
    setGiphyResults(json.data || []);
    console.log('[useGiphy] results:', json.data);
  }, []);
  const selectGif = useCallback((gif: any) => {
    setSelectedGif(gif);
    console.log('[useGiphy] selected:', gif);
  }, []);
  return { giphyResults, searchGiphy, selectGif, selectedGif };
}

export function usePolls(chatId: string, userId?: string) {
  const [polls, setPolls] = useState<any[]>([]);
  const [votes, setVotes] = useState<{ [pollId: string]: any }>({});
  useEffect(() => {
    if (!chatId) return;
    const pollChannel = supabase
      .channel('polls_' + chatId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'polls', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          fetchPolls();
        }
      )
      .subscribe();
    fetchPolls();
    return () => {
      supabase.removeChannel(pollChannel);
    };
  }, [chatId]);
  useEffect(() => {
    if (!userId) return;
    const voteChannel = supabase
      .channel('poll_votes_' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'poll_votes', filter: `user_id=eq.${userId}` },
        (payload) => {
          fetchVotes();
        }
      )
      .subscribe();
    fetchVotes();
    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [userId]);
  const fetchPolls = useCallback(async () => {
    if (!chatId) return;
    const { data, error } = await supabase
      .from('polls')
      .select('*')
      .eq('chat_id', chatId);
    if (!error && data) {
      setPolls(data);
      console.log('[usePolls] polls:', data);
    } else {
      console.log('[usePolls] error:', error);
    }
  }, [chatId]);
  const fetchVotes = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('poll_votes')
      .select('poll_id, selected_options')
      .eq('user_id', userId);
    if (!error && data) {
      const v: { [pollId: string]: any } = {};
      data.forEach((row: any) => {
        v[row.poll_id] = row.selected_options;
      });
      setVotes(v);
      console.log('[usePolls] votes:', v);
    } else {
      console.log('[usePolls] votes error:', error);
    }
  }, [userId]);
  const createPoll = useCallback(async (question: string, options: string[], allowMultiple: boolean = false, expiresAt?: Date) => {
    if (!chatId || !userId) return;
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, sender_id: userId, content: question, type: 'poll' })
      .select()
      .single();
    if (messageError || !message) return;
    await supabase
      .from('polls')
      .insert({
        message_id: message.id,
        chat_id: chatId,
        question,
        options: options.map((option, i) => ({ id: i.toString(), text: option, votes: 0 })),
        allow_multiple: allowMultiple,
        expires_at: expiresAt ? expiresAt.toISOString() : null
      });
    fetchPolls();
    console.log('[usePolls] created poll:', question, options);
  }, [chatId, userId, fetchPolls]);
  const votePoll = useCallback(async (pollId: string, selectedOptions: string[]) => {
    if (!userId) return;
    await supabase
      .from('poll_votes')
      .upsert({ poll_id: pollId, user_id: userId, selected_options: selectedOptions }, { onConflict: 'poll_id,user_id' });
    fetchVotes();
    console.log('[usePolls] voted:', pollId, selectedOptions);
  }, [userId, fetchVotes]);
  return { polls, votes, createPoll, votePoll };
}

export function useMuteChat(chatId: string, userId?: string) {
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    if (!chatId || !userId) return;
    const channel = supabase
      .channel('mute_chat_' + chatId + '_' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_members', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          fetchMute();
        }
      )
      .subscribe();
    fetchMute();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, userId]);
  const fetchMute = useCallback(async () => {
    if (!chatId || !userId) return;
    const { data, error } = await supabase
      .from('chat_members')
      .select('is_muted')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single();
    if (!error && data) {
      setIsMuted(!!data.is_muted);
      console.log('[useMuteChat] isMuted:', !!data.is_muted);
    } else {
      console.log('[useMuteChat] error:', error);
    }
  }, [chatId, userId]);
  const setMute = useCallback(async (mute: boolean) => {
    if (!chatId || !userId) return;
    await supabase
      .from('chat_members')
      .update({ is_muted: mute })
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    fetchMute();
    console.log('[useMuteChat] setMute:', mute);
  }, [chatId, userId, fetchMute]);
  return { isMuted, setMute };
}

export function useChatHeaderData(chat: any, userId?: string) {
  const [headerUser, setHeaderUser] = useState('');
  const [headerAvatar, setHeaderAvatar] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!chat || !userId) return;
    if (chat.type === 'direct') {
      (async () => {
        const { data, error } = await supabase
          .from('chat_profiles')
          .select('user_id, username, avatar_url')
          .eq('chat_id', chat.id)
          .neq('user_id', userId);
        if (!error && data && data.length > 0) {
          setHeaderUser(data[0].username);
          setHeaderAvatar(data[0].avatar_url);
          setOtherUserId(data[0].user_id);
          console.log('[useChatHeaderData] header:', data[0]);
        } else {
          console.log('[useChatHeaderData] error:', error);
        }
      })();
    } else {
      setHeaderUser(chat.name || '');
      setHeaderAvatar(chat.avatar || '');
      setLastSeen('');
      setOtherUserId(null);
    }
  }, [chat, userId]);
  useEffect(() => {
    if (!otherUserId) return;
    const channel = supabase
      .channel('last_seen_' + otherUserId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${otherUserId}` },
        (payload) => {
          if (payload.new && payload.new.last_seen) {
            setLastSeen(new Date(payload.new.last_seen).toLocaleString());
            console.log('[useChatHeaderData] lastSeen updated:', payload.new.last_seen);
          }
        }
      )
      .subscribe();
    (async () => {
      const { data, error } = await supabase
        .from('users')
        .select('last_seen')
        .eq('id', otherUserId)
        .single();
      if (!error && data) {
        setLastSeen(new Date(data.last_seen).toLocaleString());
        console.log('[useChatHeaderData] lastSeen initial:', data.last_seen);
      } else {
        console.log('[useChatHeaderData] lastSeen error:', error);
      }
    })();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUserId]);
  return { headerUser, headerAvatar, lastSeen };
}

export function useReactions(messageId: string, userId?: string) {
  const [reactions, setReactions] = useState<any[]>([]);
  useEffect(() => {
    if (!messageId) return;
    const channel = supabase
      .channel('message_reactions_' + messageId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions', filter: `message_id=eq.${messageId}` },
        (payload) => {
          fetchReactions();
        }
      )
      .subscribe();
    fetchReactions();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);
  const fetchReactions = useCallback(async () => {
    if (!messageId) return;
    const { data, error } = await supabase
      .from('message_reactions')
      .select('user_id, reaction')
      .eq('message_id', messageId);
    if (!error && data) {
      setReactions(data);
      console.log('[useReactions] reactions:', data);
    } else {
      console.log('[useReactions] error:', error);
    }
  }, [messageId]);
  const addReaction = useCallback(async (reaction: string) => {
    if (!userId || !messageId) return;
    await supabase
      .from('message_reactions')
      .upsert({ message_id: messageId, user_id: userId, reaction }, { onConflict: 'message_id,user_id' });
    fetchReactions();
    console.log('[useReactions] addReaction:', reaction);
  }, [userId, messageId, fetchReactions]);
  const removeReaction = useCallback(async () => {
    if (!userId || !messageId) return;
    await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId);
    fetchReactions();
    console.log('[useReactions] removeReaction');
  }, [userId, messageId, fetchReactions]);
  return { reactions, addReaction, removeReaction };
} 