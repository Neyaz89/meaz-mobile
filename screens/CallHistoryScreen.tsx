import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import CallService from '../components/call/CallService';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const CallHistoryScreen = () => {
  const { user } = useAuthStore();
  const [calls, setCalls] = useState<any[]>([]);
  const [users, setUsers] = useState<{ [id: string]: any }>({});

  // Fetch call history
  useEffect(() => {
    const fetchHistory = async () => {
      const data = await CallService.getCallHistory(user.id);
      setCalls(data);
      // Fetch all unique user profiles
      const userIds = Array.from(new Set(data.flatMap((c: any) => [c.caller_id, c.receiver_id]).filter((id: string) => id !== user.id)));
      const profiles: { [id: string]: any } = {};
      for (const id of userIds) {
        const { data: u } = await supabase.from('users').select('*').eq('id', id).single();
        if (u) profiles[id] = u;
      }
      setUsers(profiles);
    };
    if (user?.id) fetchHistory();
  }, [user]);

  // Format duration
  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const s = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Format timestamp
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString();
  };

  // Render call item
  const renderItem = ({ item }: { item: any }) => {
    const isOutgoing = item.caller_id === user.id;
    const otherUser = users[isOutgoing ? item.receiver_id : item.caller_id];
    const missed = item.status === 'missed' || item.status === 'rejected';
    return (
      <View style={styles.item}>
        <Image source={otherUser?.avatar_url ? { uri: otherUser.avatar_url } : require('../assets/images/default-avatar.png')} style={styles.avatar} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{otherUser?.display_name || otherUser?.username || 'User'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Ionicons name={item.type === 'video' ? 'videocam' : 'call'} size={18} color={missed ? '#FF4444' : '#25d366'} style={{ marginRight: 6 }} />
            <Text style={[styles.status, { color: missed ? '#FF4444' : '#25d366' }]}>{missed ? 'Missed' : 'Answered'}</Text>
            {item.started_at && item.ended_at && !missed && (
              <Text style={styles.duration}> • {formatDuration(item.started_at, item.ended_at)}</Text>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Call History</Text>
      <FlatList
        data={calls}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Text style={styles.empty}>No calls yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181a20',
    paddingTop: 32,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 18,
    alignSelf: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232526',
    borderRadius: 18,
    marginHorizontal: 18,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  status: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  duration: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 6,
  },
  time: {
    fontSize: 13,
    color: '#bbb',
    marginTop: 2,
  },
  empty: {
    color: '#888',
    fontSize: 16,
    alignSelf: 'center',
    marginTop: 64,
  },
});

export default CallHistoryScreen; 