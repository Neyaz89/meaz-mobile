import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { supabase, uploadFileWithRetry } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Chat, Message } from '../../types';
import { ChatBubble } from './ChatBubble';
import { InputBar } from './InputBar';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

const { width } = Dimensions.get('window');

interface AdvancedChatInterfaceProps {
  chat: Chat;
  onBack: () => void;
}

export const AdvancedChatInterface: React.FC<AdvancedChatInterfaceProps> = ({ 
  chat, 
  onBack 
}) => {
  const { user } = useAuthStore();
  const { 
    messages, 
    loadMessages, 
    sendMessage, 
    setTypingStatus,
    addMessage 
  } = useChatStore();
  
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [inputHeight, setInputHeight] = useState(40);
  
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const recordingAnimValue = useSharedValue(1);
  
  const chatMessages = useMemo(() => messages[chat.id] || [], [messages, chat.id]);
  
  // Load messages on mount
  useEffect(() => {
    loadMessages(chat.id);
  }, [chat.id, loadMessages]);
  
  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages_${chat.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chat.id}`
        },
        (payload) => {
          const newMessage = payload.new;
          if (newMessage && newMessage.sender_id !== user?.id) {
            addMessage(chat.id, newMessage);
          }
        }
      )
      .subscribe();
    
    return () => {
      channel.unsubscribe();
    };
  }, [chat.id, user?.id, addMessage]);
  
  // Handle typing indicator
  const handleTyping = useCallback((text: string) => {
    setInputMessage(text);
    
    if (user && text.length > 0) {
      setTypingStatus(chat.id, user.id, true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(chat.id, user.id, false);
      }, 2000);
    } else if (user) {
      setTypingStatus(chat.id, user.id, false);
    }
  }, [chat.id, user, setTypingStatus]);
  
  // Send text message
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !user) return;
    
    const messageContent = inputMessage.trim();
    setInputMessage('');
    setReplyTo(null);
    
    // Clear typing status
    setTypingStatus(chat.id, user.id, false);
    
    try {
      await sendMessage(chat.id, messageContent, 'text');
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message');
    }
  }, [inputMessage, user, chat.id, sendMessage, setTypingStatus]);
  
  // Handle media attachment
  const handleAttachment = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        setIsUploading(true);
        const asset = result.assets[0];
        const fileExtension = asset.uri.split('.').pop();
        const fileName = `${Date.now()}.${fileExtension}`;
        const filePath = `chat_media/${chat.id}/${fileName}`;
        
        try {
          const publicUrl = await uploadFileWithRetry(asset.uri, filePath);
          await sendMessage(chat.id, publicUrl, asset.type === 'video' ? 'video' : 'image');
        } catch (uploadError) {
          console.error('Upload failed:', uploadError);
          Alert.alert('Error', 'Failed to upload media');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('Media picker error:', error);
      Alert.alert('Error', 'Failed to pick media');
      setIsUploading(false);
    }
  }, [chat.id, sendMessage]);
  
  // Voice recording
  const startVoiceRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone permission is required for voice messages');
        return;
      }
      
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      
      setRecording(newRecording);
      setIsRecording(true);
      
      // Start animation
      recordingAnimValue.value = withSpring(1.2, { duration: 1000 });
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start voice recording');
    }
  }, [recordingAnimValue]);
  
  const stopVoiceRecording = useCallback(async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      recordingAnimValue.value = withSpring(1);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        setIsUploading(true);
        const fileName = `voice_${Date.now()}.m4a`;
        const filePath = `voice_messages/${chat.id}/${fileName}`;
        
        try {
          const publicUrl = await uploadFileWithRetry(uri, filePath);
          await sendMessage(chat.id, publicUrl, 'voice');
        } catch (uploadError) {
          console.error('Voice upload failed:', uploadError);
          Alert.alert('Error', 'Failed to upload voice message');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop voice recording');
      setIsRecording(false);
      setIsUploading(false);
    }
  }, [recording, chat.id, sendMessage, recordingAnimValue]);
  
  // Animated style for recording button
  const recordingAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordingAnimValue.value }],
  }));
  
  // Render message item
  const renderMessage = useCallback(({ item }: { item: Message }) => (
    <ChatBubble
      message={item}
      isSent={item.senderId === user?.id}
      showAvatar={item.senderId !== user?.id}
      avatarUri={item.sender?.avatar}
    />
  ), [user?.id]);
  
  // Get other user for header
  const otherUser = useMemo(() => {
    if (chat.type === 'direct' && chat.members) {
      return chat.members.find(member => member.userId !== user?.id)?.user;
    }
    return null;
  }, [chat, user?.id]);
  
  const headerTitle = chat.type === 'direct' 
    ? otherUser?.displayName || otherUser?.username || 'User'
    : chat.name;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          {chat.type === 'direct' && otherUser && (
            <Text style={styles.headerSubtitle}>
              {otherUser.status === 'online' ? 'Online' : 'Last seen recently'}
            </Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="videocam-outline" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="call-outline" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Messages */}
      <KeyboardAvoidingView 
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <MessageList
          messages={chatMessages}
          renderMessage={renderMessage}
          userId={user?.id || ''}
          onEndReached={() => {
            // Load more messages
          }}
        />
        
        {/* Typing Indicator */}
        <TypingIndicator 
          isTyping={false} // TODO: Implement typing detection
          username={otherUser?.displayName}
        />
        
        {/* Reply Preview */}
        {replyTo && (
          <View style={styles.replyPreview}>
            <Text style={styles.replyText}>
              Replying to: {replyTo.content.substring(0, 50)}...
            </Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* Input Bar */}
        <InputBar
          message={inputMessage}
          onMessageChange={handleTyping}
          onSend={handleSendMessage}
          onAttachment={handleAttachment}
          onVoice={startVoiceRecording}
          onStopVoice={stopVoiceRecording}
          isVoiceRecording={isRecording}
          onEmoji={() => {}}
          onPoll={() => {}}
          replyTo={replyTo ? { content: replyTo.content } : null}
          onCancelReply={() => setReplyTo(null)}
          inputHeight={inputHeight}
          setInputHeight={setInputHeight}
        />
        
        {/* Upload Progress */}
        {isUploading && (
          <View style={styles.uploadProgress}>
            <Text style={styles.uploadText}>Uploading...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  replyText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  uploadProgress: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
  },
});