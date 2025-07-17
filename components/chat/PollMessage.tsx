import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { Poll } from '../../types';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useToast } from '../ui/Toast';

interface PollMessageProps {
  pollId: string;
}

export const PollMessage: React.FC<PollMessageProps> = ({ pollId }) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [userVotes, setUserVotes] = useState<string[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  const { voteInPoll } = useChatStore();
  const { user } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    // Load poll data
    loadPollData();
  }, [pollId]);

  const loadPollData = async () => {
    try {
      // This would fetch poll data from the store or API
      // For now, we'll create a mock poll
      const mockPoll: Poll = {
        id: pollId,
        messageId: pollId,
        question: 'What\'s your favorite programming language?',
        options: [
          { id: '1', text: 'JavaScript', votes: 15, percentage: 37.5, hasVoted: false },
          { id: '2', text: 'Python', votes: 12, percentage: 30, hasVoted: false },
          { id: '3', text: 'TypeScript', votes: 8, percentage: 20, hasVoted: false },
          { id: '4', text: 'Rust', votes: 5, percentage: 12.5, hasVoted: false },
        ],
        allowMultiple: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date(),
        votes: [],
        totalVotes: 40,
      };
      setPoll(mockPoll);
    } catch (error) {
      console.error('Error loading poll:', error);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!poll || !user) return;

    setIsVoting(true);
    try {
      let newVotes: string[];
      
      if (poll.allowMultiple) {
        // Toggle vote for multiple choice
        if (userVotes.includes(optionId)) {
          newVotes = userVotes.filter(id => id !== optionId);
        } else {
          newVotes = [...userVotes, optionId];
        }
      } else {
        // Single choice - replace vote
        newVotes = [optionId];
      }

      await voteInPoll(pollId, newVotes);
      setUserVotes(newVotes);
      
      // Update local poll data
      if (poll) {
        const updatedPoll = { ...poll };
        updatedPoll.options = updatedPoll.options.map(option => {
          if (option.id === optionId) {
            const voteChange = userVotes.includes(optionId) ? -1 : 1;
            return { ...option, votes: option.votes + voteChange };
          }
          return option;
        });
        setPoll(updatedPoll);
      }

      toast.success('Vote recorded!');
    } catch (error) {
      Alert.alert('Error', 'Failed to record vote');
    } finally {
      setIsVoting(false);
    }
  };

  const getTimeLeft = () => {
    if (!poll?.expiresAt) return null;
    
    const now = new Date();
    const expiresAt = new Date(poll.expiresAt);
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) return 'Expired';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    } else {
      return `${minutes}m left`;
    }
  };

  const getProgressPercentage = (votes: number) => {
    if (!poll || poll.totalVotes === 0) return 0;
    return (votes / poll.totalVotes) * 100;
  };

  if (!poll) {
    return (
      <View style={styles.loadingContainer}>
        <ThemedText style={styles.loadingText}>Loading poll...</ThemedText>
      </View>
    );
  }

  const timeLeft = getTimeLeft();
  const isExpired = timeLeft === 'Expired';

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bar-chart" size={20} color="#007AFF" />
        <ThemedText style={styles.question}>{poll.question}</ThemedText>
      </View>

      <View style={styles.optionsContainer}>
        {poll.options.map((option) => {
          const isSelected = userVotes.includes(option.id);
          const progressPercentage = getProgressPercentage(option.votes);
          const isWinning = option.votes === Math.max(...poll.options.map(o => o.votes));

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionContainer,
                isSelected && styles.selectedOption,
                isExpired && styles.expiredOption,
              ]}
              onPress={() => !isExpired && handleVote(option.id)}
              disabled={isExpired || isVoting}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionHeader}>
                  <ThemedText style={[
                    styles.optionText,
                    isSelected && styles.selectedOptionText,
                  ]}>
                    {option.text}
                  </ThemedText>
                  
                  {isSelected && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={20} 
                      color="#007AFF" 
                      style={styles.checkIcon}
                    />
                  )}
                  
                  {isWinning && option.votes > 0 && (
                    <Ionicons 
                      name="trophy" 
                      size={16} 
                      color="#FFD700" 
                      style={styles.trophyIcon}
                    />
                  )}
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${progressPercentage}%` },
                        isSelected && styles.selectedProgressFill,
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.voteCount}>
                    {option.votes} vote{option.votes !== 1 ? 's' : ''} ({progressPercentage.toFixed(1)}%)
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <ThemedText style={styles.totalVotes}>
          {poll.totalVotes} total vote{poll.totalVotes !== 1 ? 's' : ''}
        </ThemedText>
        
        {timeLeft && (
          <ThemedText style={[
            styles.timeLeft,
            isExpired && styles.expiredText,
          ]}>
            {timeLeft}
          </ThemedText>
        )}
        
        {poll.allowMultiple && (
          <ThemedText style={styles.multipleChoice}>
            Multiple choice
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionContainer: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  expiredOption: {
    opacity: 0.7,
  },
  optionContent: {
    padding: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 8,
  },
  trophyIcon: {
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  selectedProgressFill: {
    backgroundColor: '#0056CC',
  },
  voteCount: {
    fontSize: 12,
    color: '#8E8E93',
    minWidth: 80,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  totalVotes: {
    fontSize: 12,
    color: '#8E8E93',
  },
  timeLeft: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '500',
  },
  expiredText: {
    color: '#FF3B30',
  },
  multipleChoice: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
}); 