import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const GRID_SIZE = 20;
const CELL_SIZE = Math.floor(width / GRID_SIZE);
const INIT_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
];
const INIT_DIR = { x: 1, y: 0 };
const SPEED = 80;

function getRandomFood(snake) {
  let food;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * (Math.floor(height / CELL_SIZE) - 2)) + 1,
    };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
  return food;
}

export default function SnakeGame({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [snake, setSnake] = useState(INIT_SNAKE);
  const [dir, setDir] = useState(INIT_DIR);
  const [food, setFood] = useState(getRandomFood(INIT_SNAKE));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const moveRef = useRef();

  useEffect(() => {
    if (gameState === 'playing') {
      moveRef.current = setInterval(() => {
        setSnake(snk => {
          const head = { x: snk[0].x + dir.x, y: snk[0].y + dir.y };
          if (
            head.x < 0 || head.x >= GRID_SIZE ||
            head.y < 0 || head.y >= Math.floor(height / CELL_SIZE) ||
            snk.some(s => s.x === head.x && s.y === head.y)
          ) {
            setGameState('ended');
            setBest(b => Math.max(b, score));
            setXp(score * 2);
            storeSoloGameSession('snake', score, 1, true, score * 2);
            Vibration.vibrate(100);
            return snk;
          }
          let newSnake = [head, ...snk];
          if (head.x === food.x && head.y === food.y) {
            setScore(s => s + 1);
            setFood(getRandomFood(newSnake));
            Vibration.vibrate(30);
          } else {
            newSnake.pop();
          }
          return newSnake;
        });
      }, SPEED);
      return () => clearInterval(moveRef.current);
    }
  }, [gameState, dir, food, score]);

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 || Math.abs(g.dy) > 20,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > Math.abs(g.dy)) {
        if (g.dx > 0 && dir.x !== -1) setDir({ x: 1, y: 0 });
        else if (g.dx < 0 && dir.x !== 1) setDir({ x: -1, y: 0 });
      } else {
        if (g.dy > 0 && dir.y !== -1) setDir({ x: 0, y: 1 });
        else if (g.dy < 0 && dir.y !== 1) setDir({ x: 0, y: -1 });
      }
    },
  });

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Snake</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => { setGameState('playing'); setSnake(INIT_SNAKE); setDir(INIT_DIR); setScore(0); setFood(getRandomFood(INIT_SNAKE)); }}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.board}>
          {snake.map((s, i) => (
            <View key={i} style={[styles.snake, { left: s.x * CELL_SIZE, top: s.y * CELL_SIZE }]} />
          ))}
          <View style={[styles.food, { left: food.x * CELL_SIZE, top: food.y * CELL_SIZE }]} />
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
  board: { flex: 1, backgroundColor: '#e0f7fa', borderRadius: 12, margin: 16 },
  snake: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#43A047', borderRadius: 4 },
  food: { position: 'absolute', width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#FF6B35', borderRadius: CELL_SIZE / 2 },
  score: { fontSize: 20, color: '#222', marginTop: 8, textAlign: 'center' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 