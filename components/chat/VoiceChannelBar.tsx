import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { VoiceChannel } from '../../types';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import { useToast } from '../ui/Toast';

interface VoiceChannelBarProps {
  chatId: string;
}

export const VoiceChannelBar: React.FC<VoiceChannelBarProps> = ({ chatId }) => {
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [activeChannels, setActiveChannels] = useState<VoiceChannel[]>([]);
  const [userChannels, setUserChannels] = useState<string[]>([]);

  const { loadVoiceChannels, joinVoiceChannel, leaveVoiceChannel } = useChatStore();
  const { user } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    loadVoiceChannels(chatId);
  }, [chatId]);

  const handleJoinChannel = async (channelId: string) => {
    try {
      await joinVoiceChannel(channelId);
      setUserChannels([...userChannels, channelId]);
      toast.show('Joined voice channel!');
    } catch (error) {
      Alert.alert('Error', 'Failed to join voice channel');
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    try {
      await leaveVoiceChannel(channelId);
      setUserChannels(userChannels.filter(id => id !== channelId));
      toast.show('Left voice channel');
    } catch (error) {
      Alert.alert('Error', 'Failed to leave voice channel');
    }
  };

  const createVoiceChannel = async () => {
    Alert.prompt(
      'Create Voice Channel',
      'Enter channel name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (name) => {
            if (name && name.trim()) {
              try {
                // This would call a function to create a voice channel
                // For now, we'll just show a success message
                toast.show('Voice channel created!');
                setShowChannelModal(false);
              } catch (error) {
                Alert.alert('Error', 'Failed to create voice channel');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (activeChannels.length === 0) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
        <View style={styles.channelInfo}>
          <Ionicons name="mic" size={16} color="#34C759" />
          <ThemedText style={styles.channelText}>
            {activeChannels.length} active voice channel{activeChannels.length > 1 ? 's' : ''}
          </ThemedText>
        </View>
        
        <TouchableOpacity
          style={styles.joinButton}
          onPress={() => setShowChannelModal(true)}
        >
          <ThemedText style={styles.joinButtonText}>Join</ThemedText>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showChannelModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Voice Channels</ThemedText>
            <TouchableOpacity onPress={() => setShowChannelModal(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.channelList}>
            {activeChannels.map((channel) => (
              <View key={channel.id} style={styles.channelItem}>
                <View style={styles.channelDetails}>
                  <ThemedText style={styles.channelName}>{channel.name}</ThemedText>
                  <ThemedText style={styles.channelDescription}>
                    {channel.description || 'No description'}
                  </ThemedText>
                  <ThemedText style={styles.participantCount}>
                    {channel.participantCount} / {channel.maxParticipants} participants
                  </ThemedText>
                </View>

                {userChannels.includes(channel.id) ? (
                  <TouchableOpacity
                    style={styles.leaveButton}
                    onPress={() => handleLeaveChannel(channel.id)}
                  >
                    <ThemedText style={styles.leaveButtonText}>Leave</ThemedText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.joinChannelButton}
                    onPress={() => handleJoinChannel(channel.id)}
                  >
                    <ThemedText style={styles.joinChannelButtonText}>Join</ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.createChannelButton}
            onPress={createVoiceChannel}
          >
            <Ionicons name="add" size={20} color="white" />
            <ThemedText style={styles.createChannelText}>Create Channel</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#34C759',
  },
  joinButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  channelList: {
    flex: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  channelDetails: {
    flex: 1,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  channelDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  participantCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  joinChannelButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinChannelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createChannelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  createChannelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 