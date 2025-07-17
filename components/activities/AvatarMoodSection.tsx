import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Animated, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const AvatarMoodSection = () => {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [mood, setMood] = useState('');
  const [scaleAnim] = useState(new Animated.Value(1));

  const moods = ['😊', '😎', '🤔', '😴', '😍', '🤗', '😌', '😄'];

  const handleUpdate = async () => {
    // TODO: Get current user id
    await supabase.from('users').update({ avatar_url: avatarUrl, status: mood }).eq('id', 'CURRENT_USER_ID');
    
    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Avatar & Mood
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            Express yourself
          </ThemedText>
        </View>
      </View>

      <LinearGradient
        colors={['#3498db', '#2980b9']}
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="person-circle" size={24} color="white" style={{ marginRight: 10 }} />
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
            Customize Your Avatar
          </ThemedText>
        </View>
        
        <TextInput
          style={{
            backgroundColor: 'rgba(255,255,255,0.9)',
            borderRadius: 15,
            padding: 15,
            fontSize: 16,
            marginBottom: 15,
          }}
          placeholder="Avatar URL..."
          value={avatarUrl}
          onChangeText={setAvatarUrl}
        />
        
        <ThemedText style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Choose Your Mood
        </ThemedText>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 }}>
          {moods.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setMood(emoji)}
              style={{
                backgroundColor: mood === emoji ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                padding: 10,
                borderRadius: 20,
                margin: 5,
                borderWidth: 2,
                borderColor: mood === emoji ? 'white' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            onPress={handleUpdate}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 25,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Update Profile</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

export default AvatarMoodSection; 