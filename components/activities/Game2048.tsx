import React, { useEffect, useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const SIZE = 4;
const START_TILES = 2;

function getEmptyBoard() {
  return Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
}
function getRandomInt(max) { return Math.floor(Math.random() * max); }
function addRandomTile(board) {
  let empty = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!board[r][c]) empty.push([r, c]);
  if (empty.length === 0) return board;
  const [r, c] = empty[getRandomInt(empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  return board;
}
function clone(board) { return board.map(row => [...row]); }
function transpose(board) { return board[0].map((_, i) => board.map(row => row[i])); }
function reverse(board) { return board.map(row => [...row].reverse()); }
function moveLeft(board) {
  let moved = false, score = 0;
  let newBoard = board.map(row => {
    let arr = row.filter(x => x);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr[i + 1] = 0; }
    }
    arr = arr.filter(x => x);
    while (arr.length < SIZE) arr.push(0);
    if (arr.some((v, i) => v !== row[i])) moved = true;
    return arr;
  });
  return { board: newBoard, moved, score };
}
function isGameOver(board) {
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (!board[r][c]) return false;
    if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return false;
    if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return false;
  }
  return true;
}

export default function Game2048({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [board, setBoard] = useState(getEmptyBoard());
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (gameState === 'start') {
      let b = getEmptyBoard();
      for (let i = 0; i < START_TILES; i++) b = addRandomTile(b);
      setBoard(b);
      setScore(0);
    }
  }, [gameState]);

  const handleMove = dir => {
    let b = clone(board), res, moved = false, addScore = 0;
    if (dir === 'left') { res = moveLeft(b); b = res.board; moved = res.moved; addScore = res.score; }
    if (dir === 'right') { b = reverse(b); res = moveLeft(b); b = reverse(res.board); moved = res.moved; addScore = res.score; }
    if (dir === 'up') { b = transpose(b); res = moveLeft(b); b = transpose(res.board); moved = res.moved; addScore = res.score; }
    if (dir === 'down') { b = transpose(b); b = reverse(b); res = moveLeft(b); b = reverse(res.board); b = transpose(b); moved = res.moved; addScore = res.score; }
    if (moved) {
      b = addRandomTile(b);
      setBoard(b);
      setScore(s => s + addScore);
      Vibration.vibrate(20);
      if (b.flat().includes(2048)) {
        setGameState('ended');
        setBest(b => Math.max(b, score + addScore));
        setXp(score + addScore);
        storeSoloGameSession('2048', score + addScore, 1, true, score + addScore);
      } else if (isGameOver(b)) {
        setGameState('ended');
        setBest(b => Math.max(b, score + addScore));
        setXp(score + addScore);
        storeSoloGameSession('2048', score + addScore, 1, true, score + addScore);
      }
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 || Math.abs(g.dy) > 20,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > Math.abs(g.dy)) {
        if (g.dx > 0) handleMove('right'); else handleMove('left');
      } else {
        if (g.dy > 0) handleMove('down'); else handleMove('up');
      }
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>2048</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.board}>
          {board.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((val, c) => (
                <View key={c} style={[styles.cell, { backgroundColor: val ? `rgba(255,200,0,${0.2 + val / 2048})` : '#eee' }] }>
                  <Text style={styles.cellText}>{val || ''}</Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={styles.score}>Score: {score}</Text>
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
  board: { margin: 16, backgroundColor: '#f2eecb', borderRadius: 12, padding: 8 },
  row: { flexDirection: 'row' },
  cell: { width: 60, height: 60, margin: 4, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  cellText: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  score: { fontSize: 20, color: '#222', marginTop: 8, textAlign: 'center' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 