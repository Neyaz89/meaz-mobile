import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const PromptsSection = () => {
  const [prompt, setPrompt] = useState<any>(null);
  const [submission, setSubmission] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [votes, setVotes] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);

  const fetchPrompt = async () => {
    const { data } = await supabase.from('prompts').select('*').order('created_at', { ascending: false }).limit(1).single();
    setPrompt(data);
  };
  const fetchSubmissions = async () => {
    if (!prompt) return;
    const { data } = await supabase.from('prompt_submissions').select('*').eq('prompt_id', prompt.id);
    setSubmissions(data || []);
  };
  const fetchVotes = async (promptSubmissionId: string) => {
    const { data } = await supabase.from('prompt_votes').select('*').eq('prompt_submission_id', promptSubmissionId);
    setVotes(data || []);
  };
  const fetchStreak = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).eq('activity', 'prompt').single();
    if (data) setStreak(data.current_streak);
  };
  const fetchAchievements = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from('achievements').select('*').eq('user_id', user.id).eq('type', 'prompt_master');
    setAchievements(data || []);
  };

  useEffect(() => { fetchPrompt(); }, []);
  useEffect(() => { fetchSubmissions(); }, [prompt]);
  useEffect(() => { fetchStreak(); fetchAchievements(); }, []);

  const handleSubmit = async () => {
    if (!prompt) return;
    await supabase.from('prompt_submissions').insert({ prompt_id: prompt.id, submission });
    setSubmission('');
    fetchSubmissions();
    
    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleVote = async (submissionId: string, vote: number) => {
    await supabase.from('prompt_votes').insert({ prompt_submission_id: submissionId, vote });
    fetchVotes(submissionId);
  };

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Daily Prompts
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            Share your thoughts
          </ThemedText>
        </View>
      </View>

      {prompt && (
        <LinearGradient
          colors={['#9b59b6', '#8e44ad']}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <Ionicons name="bulb" size={24} color="white" style={{ marginRight: 10 }} />
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
              Today&rsquo;s Prompt
            </ThemedText>
          </View>
          <ThemedText style={{ fontSize: 16, color: 'white', marginBottom: 20, lineHeight: 24 }}>
            {prompt.prompt}
          </ThemedText>
          
          <TextInput
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: 15,
              padding: 15,
              fontSize: 16,
              marginBottom: 15,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
            placeholder="Your response..."
            value={submission}
            onChangeText={setSubmission}
            multiline
          />
          
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity 
              onPress={handleSubmit}
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
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Submit Response</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>
      )}

      <FlatList
        data={submissions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <LinearGradient
            colors={['#ecf0f1', '#bdc3c7']}
            style={{
              borderRadius: 15,
              padding: 15,
              marginBottom: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <ThemedText style={{ fontSize: 14, color: '#2c3e50', lineHeight: 20 }}>
              {item.submission}
            </ThemedText>
            {/* Voting */}
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <TouchableOpacity onPress={() => handleVote(item.id, 1)}><Text style={{ fontSize: 16 }}>👍</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleVote(item.id, -1)} style={{ marginLeft: 8 }}><Text style={{ fontSize: 16 }}>👎</Text></TouchableOpacity>
              <Text style={{ marginLeft: 8, fontSize: 14, color: '#333' }}>Votes: {votes.filter(v => v.prompt_submission_id === item.id).reduce((acc, v) => acc + v.vote, 0)}</Text>
            </View>
          </LinearGradient>
        )}
        showsVerticalScrollIndicator={false}
      />
      {/* Streak and achievements */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Text style={{ color: '#FFD700', fontWeight: 'bold', marginRight: 12 }}>🔥 Streak: {streak}</Text>
        {achievements.map(a => (
          <Text key={a.id} style={{ color: '#00BFFF', fontWeight: 'bold', marginRight: 8 }}>🏆 {a.description}</Text>
        ))}
      </View>
    </View>
  );
};

export default PromptsSection; 