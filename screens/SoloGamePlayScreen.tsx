import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LazyGameLoader } from '../components/common/LazyGameLoader';

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
  const title = GAME_TITLES[game] || 'Game';

  if (!game || !GAME_TITLES[game]) {
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
        <LazyGameLoader gameType={game} navigation={navigation} />
      </View>
    </SafeAreaView>
  );
};

export default SoloGamePlayScreen; 