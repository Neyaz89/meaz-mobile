import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FifteenPuzzle from '../components/activities/FifteenPuzzle';
import FlappyBird from '../components/activities/FlappyBird';
import Game2048 from '../components/activities/Game2048';
import MemoryMatchGame from '../components/activities/MemoryMatchGame';
import QuickQuiz from '../components/activities/QuickQuiz';
import ReactionTimeGame from '../components/activities/ReactionTimeGame';
import SimonSaysGame from '../components/activities/SimonSaysGame';
import SnakeGame from '../components/activities/SnakeGame';
import TapTheDot from '../components/activities/TapTheDot';
import TypingSpeedTest from '../components/activities/TypingSpeedTest';

const GAME_COMPONENTS = {
  FlappyBird,
  ReactionTimeGame,
  MemoryMatchGame,
  Game2048,
  TapTheDot,
  SnakeGame,
  TypingSpeedTest,
  SimonSaysGame,
  FifteenPuzzle,
  QuickQuiz,
};

const GAME_TITLES = {
  FlappyBird: 'Flappy Bird',
  ReactionTimeGame: 'Reaction Time',
  MemoryMatchGame: 'Memory Match',
  Game2048: '2048',
  TapTheDot: 'Tap the Dot',
  SnakeGame: 'Snake',
  TypingSpeedTest: 'Typing Speed Test',
  SimonSaysGame: 'Simon Says',
  FifteenPuzzle: '15 Puzzle',
  QuickQuiz: 'Quick Quiz',
};

const SoloGamePlayScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  // @ts-ignore
  const { game } = route.params || {};
  const GameComponent = GAME_COMPONENTS[game];
  const title = GAME_TITLES[game] || 'Game';

  if (!GameComponent) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Game not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#FF6B35', fontWeight: 'bold' }}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
          <Ionicons name="arrow-back" size={28} color="#222" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222' }}>{title}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <GameComponent navigation={navigation} />
      </View>
    </SafeAreaView>
  );
};

export default SoloGamePlayScreen; 