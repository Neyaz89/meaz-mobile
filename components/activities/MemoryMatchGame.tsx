import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const CARD_PAIRS = 8;
const CARD_VALUES = Array.from({ length: CARD_PAIRS }, (_, i) => i + 1);
const SHUFFLED = () => [...CARD_VALUES, ...CARD_VALUES].sort(() => Math.random() - 0.5);

export default function MemoryMatchGame({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(null);
  const [xp, setXp] = useState(0);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (gameState === 'start') {
      setCards(SHUFFLED());
      setFlipped([]);
      setMatched([]);
      setScore(0);
      setMoves(0);
    }
  }, [gameState]);

  useEffect(() => {
    if (matched.length === CARD_PAIRS * 2 && gameState === 'playing') {
      setGameState('ended');
      setBest(b => (b === null ? moves : Math.min(b, moves)));
      setXp(Math.max(0, 200 - moves * 2));
      storeSoloGameSession('memory_match', 200 - moves * 2, 1, true, Math.max(0, 200 - moves * 2));
    }
  }, [matched, moves, gameState]);

  const handleFlip = idx => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    setFlipped(f => [...f, idx]);
    if (flipped.length === 1) {
      setMoves(m => m + 1);
      const first = cards[flipped[0]];
      const second = cards[idx];
      if (first === second) {
        setMatched(m => [...m, flipped[0], idx]);
        Vibration.vibrate(50);
        setScore(s => s + 10);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Memory Match</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.grid}>
          {cards.map((val, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.card, flipped.includes(idx) || matched.includes(idx) ? styles.cardFlipped : null]}
              onPress={() => handleFlip(idx)}
              disabled={flipped.length === 2 || matched.includes(idx)}
            >
              <Text style={styles.cardText}>{flipped.includes(idx) || matched.includes(idx) ? val : '?'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {gameState === 'ended' && (
        <View style={styles.centered}>
          <Text style={styles.title}>You Win!</Text>
          <Text style={styles.scoreLabel}>Moves: {moves}</Text>
          <Text style={styles.scoreLabel}>Best: {best || moves}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', margin: 16 },
  card: { width: 60, height: 80, backgroundColor: '#eee', borderRadius: 8, margin: 8, justifyContent: 'center', alignItems: 'center' },
  cardFlipped: { backgroundColor: '#FFB300' },
  cardText: { fontSize: 28, color: '#222', fontWeight: 'bold' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 