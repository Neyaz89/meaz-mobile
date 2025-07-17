import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const TimelineSection = () => {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [reactions, setReactions] = useState<any>({});
  const [comments, setComments] = useState<any>({});

  const fetchTimeline = async () => {
    // Fetch from materialized view
    const { data } = await supabase.from('friendship_timeline').select('*').order('created_at', { ascending: false });
    setTimeline(data || []);
  };
  const handleAddReaction = async (itemId: string, reaction: string) => {
    setReactions((prev: any) => ({ ...prev, [itemId]: reaction }));
    // Optionally call backend
  };
  const handleAddComment = async (itemId: string, comment: string) => {
    setComments((prev: any) => ({ ...prev, [itemId]: [...(prev[itemId] || []), comment] }));
    // Optionally call backend
  };

  useEffect(() => { 
    fetchTimeline();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const renderTimelineItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <LinearGradient
        colors={['#f39c12', '#e67e22']}
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
          <Ionicons name={item.type === 'message' ? 'chatbubble' : item.type === 'story' ? 'book' : 'trophy'} size={20} color="white" style={{ marginRight: 10 }} />
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: 'white', flex: 1 }}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </ThemedText>
        </View>
        <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 5 }}>
          {item.details}
        </ThemedText>
        {/* Reactions */}
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          {['like','love','laugh','wow','sad','angry'].map(r => (
            <TouchableOpacity key={r} onPress={() => handleAddReaction(item.id, r)}>
              <Text style={{ fontSize: 16 }}>{r === 'like' ? '👍' : r === 'love' ? '❤️' : r === 'laugh' ? '😂' : r === 'wow' ? '😮' : r === 'sad' ? '😢' : '😡'}</Text>
            </TouchableOpacity>
          ))}
          <Text style={{ marginLeft: 8, color: '#fff' }}>Reaction: {reactions[item.id]}</Text>
        </View>
        {/* Comments */}
        <FlatList
          data={comments[item.id] || []}
          keyExtractor={(c, i) => `${item.id}-c-${i}`}
          renderItem={({ item: c }) => (
            <Text style={{ fontSize: 12, color: '#fff' }}>{c}</Text>
          )}
          style={{ maxHeight: 40 }}
        />
        <TextInput placeholder="Add comment..." onSubmitEditing={e => handleAddComment(item.id, e.nativeEvent.text)} style={{ backgroundColor: '#eee', borderRadius: 8, padding: 4, fontSize: 12, marginTop: 2 }} />
      </LinearGradient>
    </Animated.View>
  );

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Friendship Timeline
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            See your journey together
          </ThemedText>
        </View>
      </View>
      
      <FlatList
        data={timeline}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderTimelineItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5 }}
      />
    </View>
  );
};

export default TimelineSection; 