import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, Modal, Text, TextInput, TouchableOpacity, Vibration, View } from 'react-native';
import { useInterval } from '../../hooks/useInterval';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';
import SoloGamesDashboard from './SoloGamesDashboard';

const { width } = Dimensions.get('window');

const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

const MiniGamesSection = () => {
  const [game, setGame] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [scoreAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [leaderboardVisible, setLeaderboardVisible] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [confetti, setConfetti] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(30);
  const [sessionId, setSessionId] = useState<string|null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const inputRef = useRef<TextInput>(null);
  const [tab, setTab] = useState<'solo'|'legacy'>('solo');
  const navigation = useNavigation();

  // Fetch a random game
  const fetchGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_random_game');
      if (error) throw error;
      if (data) setGame(data);
      setShowAnswer(false);
      setAnswer('');
    } catch (err: any) {
      setError('Failed to load game. Try again later.');
    }
    setLoading(false);
  };

  // Fetch user score
  const fetchScore = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from('game_scores').select('score').eq('user_id', user.id).single();
    if (data) setScore(data.score);
  };

  // Update user score
  const updateScore = async (delta: number) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data, error } = await supabase.rpc('increment_game_score', { user_id: user.id, delta });
    if (!error && data) setScore(data);
  };

  // Fetch leaderboard
  const fetchLeaderboard = async () => {
    const { data } = await supabase.from('game_scores').select('user_id,score,users(username,display_name,avatar_url)').order('score', { ascending: false }).limit(10);
    setLeaderboard(data || []);
  };

  const startNewSession = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    const { data, error } = await supabase.from('game_sessions').insert({ user_id: user.id, game_id: game?.id }).select('id').single();
    if (!error && data) setSessionId(data.id);
  };

  const joinSession = async (sessionId: string) => {
    setSessionId(sessionId);
    // Optionally fetch players
    fetchPlayers(sessionId);
  };

  const fetchPlayers = async (sessionId: string) => {
    const { data } = await supabase.from('game_sessions').select('user_id,users(username,avatar_url)').eq('id', sessionId);
    setPlayers(data || []);
  };

  const fetchStreak = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from('user_streaks').select('current_streak').eq('user_id', user.id).eq('activity', 'game').single();
    if (data) setStreak(data.current_streak);
  };

  const fetchAchievements = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const { data } = await supabase.from('achievements').select('*').eq('user_id', user.id).eq('type', 'game_champion');
    setAchievements(data || []);
  };

  useEffect(() => {
    fetchGame();
    fetchScore();
    fetchStreak();
    fetchAchievements();
    Animated.timing(scoreAnim, { toValue: score, duration: 500, useNativeDriver: true }).start();
  }, [score]);

  // Confetti animation (simple emoji burst)
  useEffect(() => {
    if (confetti) {
      setTimeout(() => setConfetti(false), 1200);
    }
  }, [confetti]);

  // Timer logic
  useInterval(() => {
    if (!showAnswer && timer > 0) setTimer(timer - 1);
    if (timer === 0 && !showAnswer) setShowAnswer(true);
  }, 1000);

  const handleSubmit = async () => {
    if (!game) return;
    setShowAnswer(true);
    if (game.type === 'trivia') {
      if (answer.trim().toLowerCase() === (game.answer || '').trim().toLowerCase()) {
        setConfetti(true);
        Vibration.vibrate(100);
        await updateScore(1);
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start();
      } else {
        Vibration.vibrate([0, 50, 50, 50]);
      }
    }
  };

  const handleNextGame = () => {
    fetchGame();
    setShowAnswer(false);
    setAnswer('');
    if (inputRef.current) inputRef.current.clear();
  };

  const renderGameCard = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      {/* Timer */}
      <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
        <Text style={{ color: timer < 10 ? 'red' : 'white', fontWeight: 'bold', fontSize: 18 }}>⏰ {timer}s</Text>
      </View>
      {/* Multiplayer session controls */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <TouchableOpacity onPress={startNewSession} style={{ backgroundColor: '#2ecc71', borderRadius: 10, padding: 8, marginRight: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Start Session</Text>
        </TouchableOpacity>
        <TextInput placeholder="Session ID" onSubmitEditing={e => joinSession(e.nativeEvent.text)} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 8, width: 100 }} />
      </View>
      {/* Show players in session */}
      {players.length > 0 && (
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          {players.map(p => (
            <View key={p.user_id} style={{ alignItems: 'center', marginRight: 8 }}>
              <Image source={{ uri: p.users?.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
              <Text style={{ color: 'white', fontSize: 12 }}>{p.users?.username}</Text>
            </View>
          ))}
        </View>
      )}
      {/* Streak and achievements */}
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <Text style={{ color: '#FFD700', fontWeight: 'bold', marginRight: 12 }}>🔥 Streak: {streak}</Text>
        {achievements.map(a => (
          <Text key={a.id} style={{ color: '#00BFFF', fontWeight: 'bold', marginRight: 8 }}>🏆 {a.description}</Text>
        ))}
      </View>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={{
          borderRadius: 24,
          padding: 24,
          marginBottom: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Ionicons 
            name={game?.type === 'trivia' ? 'help-circle' : 'game-controller'} 
            size={28} 
            color="white" 
            style={{ marginRight: 12 }}
          />
          <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>
            {game?.type === 'trivia' ? 'Trivia Challenge' : 'Truth or Dare'}
          </ThemedText>
        </View>
        {game ? (
          <View>
            <ThemedText style={{ fontSize: 18, color: 'white', marginBottom: 18, lineHeight: 24 }}>
              {game.question}
            </ThemedText>
            {game.type === 'trivia' && !showAnswer && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <TextInput
                  ref={inputRef}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: 'white',
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 17,
                    marginRight: 10,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.25)',
                  }}
                  placeholder="Your answer..."
                  placeholderTextColor="#eee"
                  value={answer}
                  onChangeText={setAnswer}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="done"
                  accessible accessibilityLabel="Answer input"
                />
                <TouchableOpacity 
                  onPress={handleSubmit}
                  style={{
                    backgroundColor: '#2ecc71',
                    paddingHorizontal: 18,
                    paddingVertical: 12,
                    borderRadius: 16,
                  }}
                  accessible accessibilityLabel="Submit answer"
                >
                  <Ionicons name="checkmark" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}
            {game.type === 'truth_or_dare' && (
              <View style={{ marginBottom: 12 }}>
                <ThemedText style={{ color: 'white', fontSize: 17, fontStyle: 'italic' }}>
                  {game.truth_or_dare}
                </ThemedText>
              </View>
            )}
            {showAnswer && game.type === 'trivia' && (
              <View style={{ 
                backgroundColor: 'rgba(255,255,255,0.1)', 
                padding: 18, 
                borderRadius: 18,
                borderLeftWidth: 5,
                borderLeftColor: '#2ecc71',
                marginBottom: 12,
              }}>
                <ThemedText style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 16 }}>
                  Correct answer: {game.answer}
                </ThemedText>
              </View>
            )}
            <TouchableOpacity
              onPress={handleNextGame}
              style={{
                backgroundColor: '#fff',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 18,
                alignSelf: 'flex-end',
                marginTop: 8,
                shadowColor: '#764ba2',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              }}
              accessible accessibilityLabel="Next game"
            >
              <Text style={{ color: '#764ba2', fontWeight: 'bold', fontSize: 16 }}>Next Game</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ThemedText style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
            No games available at the moment.
          </ThemedText>
        )}
      </LinearGradient>
      {confetti && (
        <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', opacity: scaleAnim }}>
          <Text style={{ fontSize: 54, opacity: 0.9 }}>🎉🎊✨</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderLeaderboard = () => (
    <Modal visible={leaderboardVisible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={{ backgroundColor: '#fff', borderRadius: 28, padding: 28, width: width * 0.88, maxHeight: width * 1.2, transform: [{ scale: leaderboardVisible ? 1 : 0.95 }], shadowColor: '#764ba2', shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#764ba2', marginBottom: 18, textAlign: 'center', letterSpacing: 1 }}>Leaderboard</Text>
          <FlatList
            data={leaderboard}
            keyExtractor={item => item.user_id}
            renderItem={({ item, index }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <Text style={{ fontWeight: 'bold', color: medalColors[index] || '#764ba2', width: 28, fontSize: 18 }}>{index < 3 ? ['🥇','🥈','🥉'][index] : `${index + 1}.`}</Text>
                {item.users?.avatar_url ? (
                  <Image source={{ uri: item.users.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }} />
                ) : (
                  <Ionicons name="person-circle" size={32} color="#764ba2" style={{ marginRight: 8 }} />
                )}
                <Text style={{ fontWeight: '600', color: '#222', flex: 1, fontSize: 16 }}>{item.users?.display_name || item.users?.username || 'User'}</Text>
                <Text style={{ fontWeight: 'bold', color: '#2ecc71', marginLeft: 8, fontSize: 16 }}>{item.score}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={{ color: '#aaa', textAlign: 'center' }}>No scores yet.</Text>}
          />
          <TouchableOpacity onPress={() => setLeaderboardVisible(false)} style={{ marginTop: 22, alignSelf: 'center' }}>
            <Text style={{ color: '#764ba2', fontWeight: 'bold', fontSize: 17 }}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 12 }}>
        <TouchableOpacity onPress={() => setTab('solo')} style={{ flex: 1, alignItems: 'center', padding: 12, borderBottomWidth: tab==='solo'?2:0, borderBottomColor: '#FF6B35' }}>
          <Text style={{ color: tab==='solo' ? '#FF6B35' : '#888', fontWeight: 'bold' }}>Solo Games</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab('legacy')} style={{ flex: 1, alignItems: 'center', padding: 12, borderBottomWidth: tab==='legacy'?2:0, borderBottomColor: '#888' }}>
          <Text style={{ color: tab==='legacy' ? '#888' : '#888', fontWeight: 'bold' }}>Mini-Games</Text>
        </TouchableOpacity>
      </View>
      {tab === 'solo' ? (
        <SoloGamesDashboard onPlayGame={g => navigation.navigate('SoloGamePlay', { game: g })} />
      ) : (
        <View>{/* legacy mini-games UI here, or a message */}</View>
      )}
    </View>
  );
};

export default MiniGamesSection; 