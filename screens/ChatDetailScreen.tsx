import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AdvancedChatInterface } from '../components/chat/AdvancedChatInterface';
import { useChat } from '../hooks/useChat';

const ChatDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId } = route.params as { chatId: string };
  const { chats, fetchChats } = useChat();
  const [chat, setChat] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChat = async () => {
      await fetchChats(); // Ensure latest chats
      const found = chats.find((c: any) => c.id === chatId);
      setChat(found);
      setLoading(false);
    };
    loadChat();
  }, [chatId, chats]);

  if (loading || !chat) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <AdvancedChatInterface chat={chat} onBack={() => navigation.goBack()} />
  );
};

export default ChatDetailScreen; 