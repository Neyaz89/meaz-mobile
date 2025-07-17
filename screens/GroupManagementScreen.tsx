import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GroupManager } from '../components/group/GroupManager';
import { useTheme } from '../components/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { Colors } from '../constants/Colors';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const GroupManagementScreen = () => {
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const { theme } = useTheme();
  const themeColors = Colors[theme] || Colors.light;
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  // Safety check - don't render if user is not available
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <ThemedText style={styles.loadingText}>Loading user data...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    if (!user) return;
    // Fetch groups where user is a member
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('type', 'group')
      .contains('participants', [user.id]);
    if (error) setError(error.message);
    setGroups(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setLoading(true);
    setError(null);
    if (!user) return;
    const { data, error } = await supabase
      .from('chats')
      .insert([{ name: groupName, description: groupDescription, type: 'group', participants: [user.id], created_by: user.id }]);
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setGroupName('');
    setGroupDescription('');
    setShowCreateGroup(false);
    fetchGroups();
  };

  const renderGroupItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.groupItem, { backgroundColor: themeColors.card || '#fff' }]}
      onPress={() => { setSelectedGroupId(item.id); setShowGroupManager(true); }}>
      <View style={styles.groupAvatar}>
        <Ionicons name="people" size={24} color={themeColors.icon} />
      </View>
      <View style={styles.groupInfo}>
        <View style={styles.groupHeader}>
          <ThemedText style={styles.groupName}>{item.name}</ThemedText>
          {item.isAdmin && (
            <View style={[styles.adminBadge, { backgroundColor: themeColors.tint }]}>
              <ThemedText style={styles.adminText}>Admin</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.groupMembers}>{item.members} members</ThemedText>
        <ThemedText style={styles.lastMessage}>{item.lastMessage}</ThemedText>
      </View>
      <View style={styles.groupActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => { setSelectedGroupId(item.id); setShowGroupManager(true); }}>
          <Ionicons name="settings-outline" size={20} color={themeColors.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="people-outline" size={20} color={themeColors.icon} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: themeColors.text }]}>Group Management</ThemedText>
        <TouchableOpacity onPress={() => setShowCreateGroup(true)}>
          <Ionicons name="add" size={24} color={themeColors.tint} />
      </TouchableOpacity>
      </View>

      {/* Groups List */}
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />

      {loading && <Text style={{ textAlign: 'center', marginTop: 16 }}>Loading...</Text>}
      {error && <Text style={{ textAlign: 'center', color: 'red', marginTop: 16 }}>{error}</Text>}

      {/* Create Group Modal */}
      <Modal visible={showCreateGroup} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowCreateGroup(false)}>
          <ThemedView style={[styles.createGroupModal, { backgroundColor: themeColors.card || '#fff' }]}>
            <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>Create New Group</ThemedText>
            
            <TextInput
              style={[styles.modalInput, { color: themeColors.text, borderColor: themeColors.border || '#e0e0e0' }]}
              placeholder="Group name"
              placeholderTextColor={themeColors.icon}
              value={groupName}
              onChangeText={setGroupName}
            />
            
            <TextInput
              style={[styles.modalInput, { color: themeColors.text, borderColor: themeColors.border || '#e0e0e0', height: 80 }]}
              placeholder="Group description (optional)"
              placeholderTextColor={themeColors.icon}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: themeColors.tint }]}
                onPress={handleCreateGroup}
              >
                <ThemedText style={styles.modalButtonText}>Create Group</ThemedText>
            </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: themeColors.icon }]}
                onPress={() => setShowCreateGroup(false)}
              >
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
          </ThemedView>
        </TouchableOpacity>
      </Modal>

      {/* GroupManager Modal */}
      <Modal visible={showGroupManager} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowGroupManager(false)}>
          <View style={[styles.createGroupModal, { backgroundColor: themeColors.card || '#fff' }]}> 
            {selectedGroupId && <GroupManager groupId={selectedGroupId} />}
            <TouchableOpacity onPress={() => setShowGroupManager(false)} style={styles.actionButton}>
              <Ionicons name="close" size={24} color={themeColors.icon} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  groupMembers: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  groupActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createGroupModal: {
    padding: 24,
    borderRadius: 16,
    width: '80%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
});

export default GroupManagementScreen; 