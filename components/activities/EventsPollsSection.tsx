import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const EventsPollsSection = () => {
  const [events, setEvents] = useState([]);
  const [polls, setPolls] = useState([]);
  const [slideAnim] = useState(new Animated.Value(0));
  const [status, setStatus] = useState<{ [key: string]: string }>({});
  const [reminder, setReminder] = useState<{ [key: string]: boolean }>({});
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('start_time', { ascending: true });
    setEvents(data || []);
  };
  const fetchPolls = async () => {
    const { data } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    setPolls(data || []);
  };

  useEffect(() => { 
    fetchEvents(); 
    fetchPolls();
    Animated.timing(slideAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleJoinEvent = async (eventId: string, statusValue: string) => {
    await supabase.from('event_participants').insert({ event_id: eventId, status: statusValue });
    setStatus((prev: { [key: string]: string }) => ({ ...prev, [eventId]: statusValue }));
  };
  const handleSetReminder = async (eventId: string) => {
    setReminder((prev: { [key: string]: boolean }) => ({ ...prev, [eventId]: true }));
    // Optionally call backend to schedule reminder
  };
  const fetchChatMessages = async (eventId: string) => {
    const { data } = await supabase.from('event_messages').select('*').eq('event_id', eventId);
    setChatMessages(data || []);
  };
  const handleSendMessage = async (eventId: string) => {
    await supabase.from('event_messages').insert({ event_id: eventId, message: chatInput });
    setChatInput('');
    fetchChatMessages(eventId);
  };

  const renderEventItem = ({ item }: { item: any }) => (
    <Animated.View style={{ transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }] }}>
      <LinearGradient
        colors={['#2ecc71', '#27ae60']}
        style={{
          borderRadius: 15,
          padding: 15,
          marginBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="calendar" size={20} color="white" style={{ marginRight: 10 }} />
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: 'white', flex: 1 }}>
            {item.name}
          </ThemedText>
        </View>
        <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 5 }}>
          {item.description}
        </ThemedText>
        <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
          {item.start_time}
        </ThemedText>
        {/* Join/Status Buttons */}
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {['going','interested','not_going'].map(s => (
            <TouchableOpacity key={s} onPress={() => handleJoinEvent(item.id, s)} style={{ backgroundColor: status[item.id] === s ? '#fff' : '#27ae60', borderRadius: 8, padding: 6, marginRight: 6 }}>
              <Text style={{ color: status[item.id] === s ? '#27ae60' : '#fff', fontWeight: 'bold' }}>{s.replace('_',' ').toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => handleSetReminder(item.id)} style={{ backgroundColor: reminder[item.id] ? '#fff' : '#f39c12', borderRadius: 8, padding: 6 }}>
            <Text style={{ color: reminder[item.id] ? '#f39c12' : '#fff', fontWeight: 'bold' }}>Remind Me</Text>
          </TouchableOpacity>
        </View>
        {/* Event Chat */}
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Event Chat</Text>
          <FlatList
            data={chatMessages.filter(m => m.event_id === item.id)}
            keyExtractor={m => m.id}
            renderItem={({ item: m }) => (
              <Text style={{ color: '#fff', fontSize: 12 }}>{m.message}</Text>
            )}
            style={{ maxHeight: 40 }}
          />
          <TextInput placeholder="Type a message..." value={chatInput} onChangeText={setChatInput} onSubmitEditing={() => handleSendMessage(item.id)} style={{ backgroundColor: '#eee', borderRadius: 8, padding: 4, fontSize: 12, marginTop: 2 }} />
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderPollItem = ({ item }: { item: any }) => (
    <Animated.View style={{ transform: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }) }] }}>
      <LinearGradient
        colors={['#e74c3c', '#c0392b']}
        style={{
          borderRadius: 15,
          padding: 15,
          marginBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Ionicons name="bar-chart" size={20} color="white" style={{ marginRight: 10 }} />
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: 'white', flex: 1 }}>
            Poll
          </ThemedText>
        </View>
        <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>
          {item.question}
        </ThemedText>
        <TouchableOpacity 
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            alignSelf: 'flex-start',
            marginTop: 10,
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Vote Now</Text>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Events & Polls
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            Join and vote together
          </ThemedText>
        </View>
      </View>
      
      <FlatList
        data={events}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderEventItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5 }}
      />
      
      <FlatList
        data={polls}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderPollItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5, marginTop: 10 }}
      />
    </View>
  );
};

export default EventsPollsSection; 