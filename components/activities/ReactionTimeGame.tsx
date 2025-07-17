import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

export default function ReactionTimeGame({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [waiting, setWaiting] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [reaction, setReaction] = useState(0);
  const [best, setBest] = useState(null);
  const [xp, setXp] = useState(0);
  const timeout = useRef(null);

  const startGame = () => {
    setGameState('playing');
    setWaiting(true);
    timeout.current = setTimeout(() => {
      setStartTime(Date.now());
      setWaiting(false);
    }, 1000 + Math.random() * 2000);
  };

  const handleTap = () => {
    if (waiting) {
      setGameState('ended');
      setReaction(0);
      Vibration.vibrate(100);
    } else if (gameState === 'playing') {
      const rt = Date.now() - startTime;
      setReaction(rt);
      setBest(b => (b === null ? rt : Math.min(b, rt)));
      setXp(Math.max(0, 500 - rt));
      storeSoloGameSession('reaction_time', rt, 1, true, Math.max(0, 500 - rt));
      setGameState('ended');
      Vibration.vibrate(30);
    }
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Reaction Time</Text>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <TouchableOpacity style={[styles.touchArea, { backgroundColor: waiting ? '#888' : '#43A047' }]} activeOpacity={1} onPress={handleTap}>
          <Text style={styles.tapText}>{waiting ? 'Wait for green...' : 'TAP!'}</Text>
        </TouchableOpacity>
      )}
      {gameState === 'ended' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Result</Text>
          <Text style={styles.scoreLabel}>Reaction: {reaction} ms</Text>
          <Text style={styles.scoreLabel}>Best: {best || reaction} ms</Text>
          <Text style={styles.scoreLabel}>XP: {xp}</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('start')}>
            <Text style={styles.startBtnText}>Restart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.startBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.startBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#222', marginBottom: 24 },
  startBtn: { backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginTop: 16 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  touchArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tapText: { fontSize: 32, color: '#fff', fontWeight: 'bold' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 