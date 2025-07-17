import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const WORDS = [
  'apple', 'banana', 'orange', 'grape', 'melon', 'kiwi', 'lemon', 'peach', 'pear', 'plum',
  'cat', 'dog', 'fish', 'bird', 'mouse', 'horse', 'sheep', 'goat', 'duck', 'frog',
  'blue', 'red', 'green', 'yellow', 'black', 'white', 'pink', 'purple', 'brown', 'gray',
  'fast', 'slow', 'quick', 'smart', 'happy', 'sad', 'fun', 'play', 'game', 'win',
];
function getRandomWords(n) {
  let arr = [];
  for (let i = 0; i < n; i++) arr.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  return arr;
}

export default function TypingSpeedTest({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [words, setWords] = useState([]);
  const [input, setInput] = useState('');
  const [current, setCurrent] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (gameState === 'start') {
      setWords(getRandomWords(15));
      setInput('');
      setCurrent(0);
      setMistakes(0);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing' && current === 0) {
      setStartTime(Date.now());
      inputRef.current && inputRef.current.focus();
    }
    if (gameState === 'playing' && current === words.length) {
      setEndTime(Date.now());
      const time = (Date.now() - startTime) / 1000 / 60;
      const wpmVal = Math.round(words.length / time);
      setWpm(wpmVal);
      setBest(b => Math.max(b, wpmVal));
      setAccuracy(Math.round(100 * (words.length - mistakes) / words.length));
      setXp(wpmVal * 2);
      storeSoloGameSession('typing_speed', wpmVal, 1, true, wpmVal * 2);
      setGameState('ended');
      Keyboard.dismiss();
    }
  }, [current, gameState]);

  const handleInput = (text) => {
    setInput(text);
    if (text.endsWith(' ')) {
      if (text.trim() === words[current]) {
        setCurrent(c => c + 1);
      } else {
        setMistakes(m => m + 1);
        setCurrent(c => c + 1);
      }
      setInput('');
    }
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Typing Speed Test</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.centered}>
          <Text style={styles.words}>{words.slice(current, current + 5).join(' ')}</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={handleInput}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            blurOnSubmit={false}
          />
          <Text style={styles.progress}>{current}/{words.length}</Text>
        </View>
      )}
      {gameState === 'ended' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Results</Text>
          <Text style={styles.scoreLabel}>WPM: {wpm}</Text>
          <Text style={styles.scoreLabel}>Accuracy: {accuracy}%</Text>
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
  words: { fontSize: 22, color: '#222', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, fontSize: 20, width: 260, marginBottom: 12 },
  progress: { fontSize: 16, color: '#888' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 