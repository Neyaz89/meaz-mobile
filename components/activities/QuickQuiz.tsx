import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { storeSoloGameSession } from '../../lib/supabase';

const QUESTIONS = [
  { q: 'What is the capital of France?', a: 'Paris', o: ['Paris', 'London', 'Berlin', 'Rome'] },
  { q: 'Which planet is known as the Red Planet?', a: 'Mars', o: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { q: 'Who wrote "Hamlet"?', a: 'Shakespeare', o: ['Shakespeare', 'Dickens', 'Austen', 'Orwell'] },
  { q: 'What is 9 x 9?', a: '81', o: ['72', '81', '99', '89'] },
  { q: 'Which gas do plants breathe in?', a: 'CO2', o: ['O2', 'CO2', 'N2', 'H2'] },
  { q: 'What is the largest ocean?', a: 'Pacific', o: ['Atlantic', 'Indian', 'Pacific', 'Arctic'] },
  { q: 'Who painted the Mona Lisa?', a: 'Da Vinci', o: ['Van Gogh', 'Da Vinci', 'Picasso', 'Rembrandt'] },
  { q: 'What is the boiling point of water?', a: '100', o: ['90', '100', '110', '120'] },
  { q: 'Which is the smallest continent?', a: 'Australia', o: ['Europe', 'Australia', 'Antarctica', 'Africa'] },
  { q: 'What is the chemical symbol for gold?', a: 'Au', o: ['Ag', 'Au', 'Pb', 'Fe'] },
];
function getRandomQuestions(n) {
  let arr = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, n);
  return arr;
}

export default function QuickQuiz({ navigation }) {
  const [gameState, setGameState] = useState('start');
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [timer, setTimer] = useState(15);

  useEffect(() => {
    if (gameState === 'start') {
      setQuestions(getRandomQuestions(5));
      setCurrent(0);
      setScore(0);
      setTimer(15);
    }
  }, [gameState]);

  useEffect(() => {
    let t;
    if (gameState === 'playing' && timer > 0) {
      t = setTimeout(() => setTimer(time => time - 1), 1000);
    } else if (timer === 0 && gameState === 'playing') {
      next();
    }
    return () => clearTimeout(t);
  }, [gameState, timer]);

  const next = () => {
    if (current + 1 < questions.length) {
      setCurrent(c => c + 1);
      setTimer(15);
    } else {
      setGameState('ended');
      setBest(b => Math.max(b, score));
      setXp(score * 10);
      storeSoloGameSession('quick_quiz', score, 1, true, score * 10);
    }
  };

  const handleAnswer = (opt) => {
    if (questions[current].a === opt) setScore(s => s + 1);
    next();
  };

  return (
    <View style={styles.container}>
      {gameState === 'start' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Quick Quiz</Text>
          <TouchableOpacity style={styles.startBtn} onPress={() => setGameState('playing')}>
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}
      {gameState === 'playing' && (
        <View style={styles.centered}>
          <Text style={styles.question}>{questions[current]?.q}</Text>
          <Text style={styles.timer}>Time: {timer}s</Text>
          {questions[current]?.o.map(opt => (
            <TouchableOpacity key={opt} style={styles.optionBtn} onPress={() => handleAnswer(opt)}>
              <Text style={styles.optionText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {gameState === 'ended' && (
        <View style={styles.centered}>
          <Text style={styles.title}>Results</Text>
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
  question: { fontSize: 22, color: '#222', marginBottom: 16, textAlign: 'center' },
  timer: { fontSize: 18, color: '#888', marginBottom: 8 },
  optionBtn: { backgroundColor: '#eee', borderRadius: 8, padding: 12, marginVertical: 6, width: 220, alignItems: 'center' },
  optionText: { fontSize: 18, color: '#222' },
  scoreLabel: { fontSize: 20, color: '#222', marginTop: 8 },
}); 