import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const COLORS = ['red', 'green', 'blue', 'yellow'];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export default function SimonSaysGame({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [sequence, setSequence] = useState([]);
  const [userSeq, setUserSeq] = useState([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [showIdx, setShowIdx] = useState(-1);
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (gameState === 'playing' && sequence.length === 0) {
      setSequence([getRandomColor()]);
      setUserSeq([]);
      setScore(0);
      setShowIdx(-1);
      setShowing(true);
    }
  }, [gameState]);

  useEffect(() => {
    if (showing && showIdx < sequence.length) {
      const timer = setTimeout(() => setShowIdx(i => i + 1), 700);
      return () => clearTimeout(timer);
    } else if (showing && showIdx === sequence.length) {
      setShowing(false);
      setShowIdx(-1);
    }
  }, [showing, showIdx, sequence]);

  const handleColor = color => {
    if (showing) return;
    setUserSeq(seq => {
      const idx = seq.length;
      if (color === sequence[idx]) {
        if (idx + 1 === sequence.length) {
          // Next round
          setScore(s => s + 1);
          setSequence(seq => [...seq, getRandomColor()]);
          setUserSeq([]);
          setShowIdx(-1);
          setShowing(true);
        }
        return [...seq, color];
      } else {
        setGameState('ended');
        setBest(b => Math.max(b, score));
        setXp(score * 5);
        storeSoloGameSession('simon_says', score, 1, true, score * 5);
        Vibration.vibrate(100);
        return seq;
      }
    });
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Simon Says</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.centered}>
          <Text style={styles.score}>Score: {score}</Text>
          <View style={styles.colorsRow}>
            {COLORS.map((c, i) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorBtn, { backgroundColor: c, opacity: showing && showIdx === i ? 0.5 : 1 }]}
                onPress={() => handleColor(c)}
                disabled={showing}
              />
            ))}
          </View>
        </View>
      )}
      {gameState === 'ended' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Game Over</Text>
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
  score: { fontSize: 20, color: '#222', marginBottom: 16 },
  colorsRow: { flexDirection: 'row', marginTop: 24 },
  colorBtn: { width: 70, height: 70, borderRadius: 35, margin: 12 },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 