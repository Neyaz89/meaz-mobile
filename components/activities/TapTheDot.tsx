import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const DOT_SIZE = 60;
const GAME_TIME = 20; // seconds

function getRandomPos() {
  return {
    x: Math.random() * (width - DOT_SIZE),
    y: Math.random() * (height - DOT_SIZE - 100) + 80,
  };
}

export default function TapTheDot({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [dotPos, setDotPos] = useState(getRandomPos());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [time, setTime] = useState(GAME_TIME);
  useEffect(() => {
    let timer;
    if (gameState === 'playing' && time > 0) {
      timer = setTimeout(() => setTime(t => t - 1), 1000);
    } else if (time === 0 && gameState === 'playing') {
      setGameState('ended');
      setBest(b => Math.max(b, score));
      setXp(score * 2);
      storeSoloGameSession('tap_the_dot', score, 1, true, score * 2);
    }
    return () => clearTimeout(timer);
  }, [gameState, time]);

  const handleTap = () => {
    setScore(s => s + 1);
    setDotPos(getRandomPos());
    Vibration.vibrate(20);
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Tap the Dot</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => { setGameState('playing'); setTime(GAME_TIME); setScore(0); }}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={{ flex: 1 }}>
          <Text style={styles.score}>Score: {score}</Text>
          <Text style={styles.timer}>Time: {time}s</Text>
          <TouchableOpacity style={[styles.dot, { left: dotPos.x, top: dotPos.y }]} onPress={handleTap} />
        </View>
      )}
      {gameState === 'ended' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Time&rsquo;s Up!</Text>
          <Text style={styles.scoreLabel}>Score: {score}</Text>
          <Text style={styles.scoreLabel}>Best: {best}</Text>
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
  dot: { position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, backgroundColor: '#43A047' },
  score: { fontSize: 20, color: '#222', marginTop: 8, textAlign: 'center' },
  timer: { fontSize: 18, color: '#888', textAlign: 'center', marginBottom: 8 },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 