import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const SIZE = 4;
function getShuffled() {
  let arr = Array.from({ length: SIZE * SIZE }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function isSolved(arr) {
  for (let i = 0; i < arr.length - 1; i++) if (arr[i] !== i + 1) return false;
  return arr[arr.length - 1] === 0;
}

export default function FifteenPuzzle({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [tiles, setTiles] = useState(getShuffled());
  const [moves, setMoves] = useState(0);
  const [best, setBest] = useState(null);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (gameState === 'start') {
      setTiles(getShuffled());
      setMoves(0);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing' && isSolved(tiles)) {
      setGameState('ended');
      setBest(b => (b === null ? moves : Math.min(b, moves)));
      setXp(Math.max(0, 200 - moves * 2));
      storeSoloGameSession('fifteen_puzzle', 200 - moves * 2, 1, true, Math.max(0, 200 - moves * 2));
    }
  }, [tiles, moves, gameState]);

  const moveTile = idx => {
    const empty = tiles.indexOf(0);
    const row = Math.floor(idx / SIZE), col = idx % SIZE;
    const erow = Math.floor(empty / SIZE), ecol = empty % SIZE;
    if ((row === erow && Math.abs(col - ecol) === 1) || (col === ecol && Math.abs(row - erow) === 1)) {
      let newTiles = [...tiles];
      [newTiles[idx], newTiles[empty]] = [newTiles[empty], newTiles[idx]];
      setTiles(newTiles);
      setMoves(m => m + 1);
    }
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>15 Puzzle</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.grid}>
          {tiles.map((val, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.tile, val === 0 && styles.emptyTile]}
              onPress={() => moveTile(idx)}
              disabled={val === 0}
            >
              <Text style={styles.tileText}>{val !== 0 ? val : ''}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.moves}>Moves: {moves}</Text>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', margin: 16, width: 260 },
  tile: { width: 60, height: 60, backgroundColor: '#eee', borderRadius: 8, margin: 4, justifyContent: 'center', alignItems: 'center' },
  emptyTile: { backgroundColor: '#fff' },
  tileText: { fontSize: 24, color: '#222', fontWeight: 'bold' },
  moves: { fontSize: 18, color: '#888', marginTop: 8, textAlign: 'center', width: '100%' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 