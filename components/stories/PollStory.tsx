import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// TODO: Add animated poll bars, voting logic
export interface PollStoryProps {
  question: string;
  options: { id: string; text: string; votes: number }[];
  onVote: (optionId: string) => void;
}
export const PollStory: React.FC<PollStoryProps> = ({ question, options, onVote }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      {options.map((opt) => (
        <View key={opt.id} style={styles.optionRow}>
          <Text style={styles.optionText}>{opt.text}</Text>
          <Text style={styles.voteCount}>{opt.votes} votes</Text>
          {/* TODO: Add vote button, animation */}
        </View>
      ))}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { padding: 16 },
  question: { fontWeight: 'bold', marginBottom: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  optionText: { flex: 1, color: '#333' },
  voteCount: { marginLeft: 8, color: '#888' },
}); 