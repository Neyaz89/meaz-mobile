import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');
const BIRD_SIZE = 40;
const GRAVITY = 2.5;
const JUMP_HEIGHT = 60;
const PIPE_WIDTH = 60;
const PIPE_GAP = 180;
const GAME_SPEED = 4;

function getRandomPipeY() {
  return Math.floor(Math.random() * (height - PIPE_GAP - 200)) + 100;
}

export default function FlappyBird({ navigation }) {
  const [gameState, setGameState] = useState('start'); // start, playing, paused, ended
  const [birdY, setBirdY] = useState(height / 2);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const birdYAnim = useRef(new Animated.Value(height / 2)).current;
  const gameLoop = useRef(null);

  useEffect(() => { setBirdY(height / 2); setPipes([]); setScore(0); }, [gameState === 'start']);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoop.current = setInterval(() => {
        setBirdY(y => y + GRAVITY);
        setPipes(ps => ps.map(p => ({ ...p, x: p.x - GAME_SPEED })).filter(p => p.x + PIPE_WIDTH > 0));
      }, 16);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (pipes.length === 0 || pipes[pipes.length - 1].x < width - 300) {
      setPipes(ps => [...ps, { x: width, y: getRandomPipeY() }]);
    }
    // Collision
    pipes.forEach(p => {
      if (
        p.x < width / 2 + BIRD_SIZE / 2 &&
        p.x + PIPE_WIDTH > width / 2 - BIRD_SIZE / 2 &&
        (birdY < p.y || birdY + BIRD_SIZE > p.y + PIPE_GAP)
      ) {
        Vibration.vibrate(100);
        setGameState('ended');
      }
    });
    // Out of bounds
    if (birdY < 0 || birdY + BIRD_SIZE > height) {
      Vibration.vibrate(100);
      setGameState('ended');
    }
    // Score
    pipes.forEach(p => {
      if (p.x + PIPE_WIDTH < width / 2 - BIRD_SIZE / 2 && !p.passed) {
        p.passed = true;
        setScore(s => s + 1);
        Vibration.vibrate(30);
      }
    });
  }, [birdY, pipes, gameState]);

  useEffect(() => {
    if (gameState === 'ended') {
      setBest(b => Math.max(b, score));
      setXp(score * 2);
      storeSoloGameSession('flappy_bird', score, 1, true, score * 2);
    }
  }, [gameState]);

  const jump = () => {
    if (gameState !== 'playing') return;
    setBirdY(y => Math.max(0, y - JUMP_HEIGHT));
    Vibration.vibrate(20);
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Flappy Bird</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <TouchableOpacity style={styles.touchArea} activeOpacity={1} onPress={jump}>
          {/* Bird */}
          <View style={[styles.bird, { top: birdY }]} />
          {/* Pipes */}
          {pipes.map((p, i) => (
            <>
              <View key={i + 'top'} style={[styles.pipe, { left: p.x, height: p.y }]} />
              <View key={i + 'bot'} style={[styles.pipe, { left: p.x, top: p.y + PIPE_GAP, height: height - (p.y + PIPE_GAP) }]} />
            </>
          ))}
          {/* Score */}
          <Text style={styles.score}>{score}</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#87CEEB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#222', marginBottom: 24 },
  startBtn: { backgroundColor: '#FF6B35', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginTop: 16 },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  touchArea: { flex: 1 },
  bird: { position: 'absolute', left: width / 2 - 20, width: BIRD_SIZE, height: BIRD_SIZE, backgroundColor: '#FFD700', borderRadius: 20, borderWidth: 2, borderColor: '#FF6B35' },
  pipe: { position: 'absolute', width: PIPE_WIDTH, backgroundColor: '#388E3C', borderRadius: 8 },
  score: { position: 'absolute', top: 40, left: width / 2 - 20, fontSize: 36, color: '#fff', fontWeight: 'bold', textShadowColor: '#222', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 