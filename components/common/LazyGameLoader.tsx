import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';

// Lazy load all games
const FlappyBird = lazy(() => import('../activities/FlappyBird'));
const Game2048 = lazy(() => import('../activities/Game2048'));
const MemoryMatchGame = lazy(() => import('../activities/MemoryMatchGame'));
const ReactionTimeGame = lazy(() => import('../activities/ReactionTimeGame'));
const SimonSaysGame = lazy(() => import('../activities/SimonSaysGame'));
const SnakeGame = lazy(() => import('../activities/SnakeGame'));
const TapTheDot = lazy(() => import('../activities/TapTheDot'));
const TypingSpeedTest = lazy(() => import('../activities/TypingSpeedTest'));
const FifteenPuzzle = lazy(() => import('../activities/FifteenPuzzle'));
const QuickQuiz = lazy(() => import('../activities/QuickQuiz'));

const GAME_COMPONENTS = {
  FlappyBird,
  Game2048,
  MemoryMatchGame,
  ReactionTimeGame,
  SimonSaysGame,
  SnakeGame,
  TapTheDot,
  TypingSpeedTest,
  FifteenPuzzle,
  QuickQuiz,
};

interface LazyGameLoaderProps {
  gameType: keyof typeof GAME_COMPONENTS;
  navigation: any;
}

const LoadingFallback = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FF6B35" />
    <ThemedText style={styles.loadingText}>Loading game...</ThemedText>
  </View>
);

export const LazyGameLoader: React.FC<LazyGameLoaderProps> = ({ gameType, navigation }) => {
  const GameComponent = GAME_COMPONENTS[gameType];

  if (!GameComponent) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Game not found</ThemedText>
      </View>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <GameComponent navigation={navigation} />
    </Suspense>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 18,
    color: '#FF4444',
  },
});