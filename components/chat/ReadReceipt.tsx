import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '../ThemedText';

interface ReadReceiptProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: string[];
  timestamp?: string;
  showTimestamp?: boolean;
}

export const ReadReceipt: React.FC<ReadReceiptProps> = ({
  status,
  readBy = [],
  timestamp,
  showTimestamp = true,
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return { name: 'time-outline' as const, color: '#9E9E9E' };
      case 'sent':
        return { name: 'checkmark-outline' as const, color: '#9E9E9E' };
      case 'delivered':
        return { name: 'checkmark-done-outline' as const, color: '#9E9E9E' };
      case 'read':
        return { name: 'checkmark-done' as const, color: '#4CAF50' };
      case 'failed':
        return { name: 'close-circle-outline' as const, color: '#F44336' };
      default:
        return { name: 'time-outline' as const, color: '#9E9E9E' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return readBy.length > 0 ? `Read by ${readBy.join(', ')}` : 'Read';
      case 'failed':
        return 'Failed to send';
      default:
        return '';
    }
  };

  const { name: iconName, color: iconColor } = getStatusIcon();

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Ionicons name={iconName} size={16} color={iconColor} />
        {status === 'read' && readBy.length > 0 && (
          <View style={styles.readIndicator}>
            <ThemedText style={styles.readText}>{readBy.length}</ThemedText>
          </View>
        )}
      </View>
      {showTimestamp && timestamp && (
        <ThemedText style={styles.timestamp}>{timestamp}</ThemedText>
      )}
      {status === 'failed' && (
        <ThemedText style={styles.errorText}>Tap to retry</ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  readIndicator: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginLeft: 2,
  },
  readText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#9E9E9E',
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
  },
}); 