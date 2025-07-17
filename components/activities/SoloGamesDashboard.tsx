import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchAchievements, fetchDailyChallenge, fetchSoloGameStats, fetchSpinRewards } from '../../lib/supabase';

interface SoloGamesDashboardProps {
  onPlayGame?: (game: string) => void;
}

const GAMES = [
  { key: 'flappy_bird', name: 'Flappy Bird', icon: 'airplane', color: '#FFB300', component: 'FlappyBird' },
  { key: 'reaction_time', name: 'Reaction Time', icon: 'flash', color: '#FF5252', component: 'ReactionTimeGame' },
  { key: 'memory_match', name: 'Memory Match', icon: 'grid', color: '#42A5F5', component: 'MemoryMatchGame' },
  { key: '2048', name: '2048', icon: 'grid-outline', color: '#8D6E63', component: 'Game2048' },
  { key: 'tap_the_dot', name: 'Tap the Dot', icon: 'ellipse', color: '#43A047', component: 'TapTheDot' },
  { key: 'snake', name: 'Snake', icon: 'git-branch', color: '#7E57C2', component: 'SnakeGame' },
  { key: 'typing_speed', name: 'Typing Speed', icon: 'create-outline', color: '#29B6F6', component: 'TypingSpeedTest' },
  { key: 'simon_says', name: 'Simon Says', icon: 'color-palette', color: '#FF7043', component: 'SimonSaysGame' },
  { key: 'fifteen_puzzle', name: '15 Puzzle', icon: 'grid', color: '#789262', component: 'FifteenPuzzle' },
  { key: 'quick_quiz', name: 'Quick Quiz', icon: 'help-circle', color: '#FBC02D', component: 'QuickQuiz' },
];

const SoloGamesDashboard: React.FC<SoloGamesDashboardProps> = ({ onPlayGame }) => {
  const [stats, setStats] = useState<any>({});
  const [achievements, setAchievements] = useState<any[]>([]);
  const [daily, setDaily] = useState<any>(null);
  const [spin, setSpin] = useState<any[]>([]);

  useEffect(() => {
    fetchSoloGameStats().then((s) => setStats(s || {}));
    fetchAchievements().then((a) => setAchievements(a || []));
    fetchDailyChallenge().then((d) => setDaily(d));
    fetchSpinRewards().then((s) => setSpin(s || []));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Solo Games</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name={"calendar" as any} size={22} color="#FF6B35" />
          <Text style={styles.actionText}>Daily Challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name={"trophy" as any} size={22} color="#FFB300" />
          <Text style={styles.actionText}>Leaderboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name={"sync" as any} size={22} color="#43A047" />
          <Text style={styles.actionText}>Spin Wheel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name={"star" as any} size={22} color="#7E57C2" />
          <Text style={styles.actionText}>Badges</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.gamesGrid}>
        {GAMES.map(game => (
          <View key={game.key} style={styles.gameCard}>
            <Ionicons name={game.icon as any} size={48} color={game.color} style={{ marginBottom: 8 }} />
            <Text style={styles.gameName}>{game.name}</Text>
            <Text style={styles.scoreLabel}>High Score: <Text style={styles.scoreValue}>{(stats as any)[game.key]?.high_score || 0}</Text></Text>
            <Text style={styles.xpLabel}>XP: <Text style={styles.xpValue}>{(stats as any)[game.key]?.xp || 0}</Text></Text>
            <TouchableOpacity style={styles.playBtn} onPress={() => onPlayGame && onPlayGame(game.component)}>
              <Text style={styles.playBtnText}>Play</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

export default SoloGamesDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 28, fontWeight: 'bold', margin: 24, color: '#222', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  actionBtn: { alignItems: 'center', padding: 8 },
  actionText: { fontSize: 13, color: '#444', marginTop: 2 },
  gamesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  gameCard: { width: 160, backgroundColor: '#fafafa', borderRadius: 16, margin: 10, alignItems: 'center', padding: 16, elevation: 2 },
  gameName: { fontWeight: 'bold', fontSize: 16, marginBottom: 4, color: '#222' },
  scoreLabel: { fontSize: 13, color: '#888' },
  scoreValue: { color: '#FF6B35', fontWeight: 'bold' },
  xpLabel: { fontSize: 13, color: '#888' },
  xpValue: { color: '#43A047', fontWeight: 'bold' },
  playBtn: { backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 24, marginTop: 10 },
  playBtnText: { color: '#fff', fontWeight: 'bold' },
}); 