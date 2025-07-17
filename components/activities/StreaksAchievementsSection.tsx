import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, FlatList, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const StreaksAchievementsSection = () => {
  const [streaks, setStreaks] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [progressAnim] = useState(new Animated.Value(0));

  const fetchStreaks = async () => {
    const { data } = await supabase.from('user_streaks').select('*');
    setStreaks(data || []);
  };
  const fetchAchievements = async () => {
    const { data } = await supabase.from('user_achievements').select('*');
    setAchievements(data || []);
  };

  useEffect(() => { 
    fetchStreaks(); 
    fetchAchievements();
    Animated.timing(progressAnim, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
  }, []);

  const renderStreakItem = ({ item }) => (
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
        <Ionicons name="flame" size={20} color="white" style={{ marginRight: 10 }} />
        <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: 'white', flex: 1 }}>
          {item.streak_type}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            {item.current_streak}
          </ThemedText>
          <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Current</ThemedText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
            {item.longest_streak}
          </ThemedText>
          <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Longest</ThemedText>
        </View>
      </View>
      <Animated.View 
        style={{
          height: 6,
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            backgroundColor: 'white',
            borderRadius: 3,
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', `${(item.current_streak / item.longest_streak) * 100}%`]
            })
          }}
        />
      </Animated.View>
    </LinearGradient>
  );

  const renderAchievementItem = ({ item }) => (
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
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="trophy" size={20} color="white" style={{ marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>
            {item.title}
          </ThemedText>
          <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            {item.description}
          </ThemedText>
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Streaks & Achievements
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            Keep your momentum going
          </ThemedText>
        </View>
      </View>
      
      <FlatList
        data={streaks}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderStreakItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5 }}
      />
      
      <FlatList
        data={achievements}
        horizontal
        keyExtractor={item => item.id}
        renderItem={renderAchievementItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5, marginTop: 10 }}
      />
    </View>
  );
};

export default StreaksAchievementsSection; 