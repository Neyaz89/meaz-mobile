import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/ThemedText';
import UserAvatar from '../components/UserAvatar';
import { Database } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useFriendsStore } from '../store/friendsStore';

type User = Database['public']['Tables']['users']['Row'];

export default function SearchScreen() {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { searchUsers, sendFriendRequest } = useFriendsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

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

  useEffect(() => {
      if (searchQuery.trim()) {
        setSearching(true);
      console.log('Searching for:', searchQuery);
      
      searchUsers(searchQuery)
        .then((results) => {
          console.log('Search results received:', results?.length || 0);
          setSearchResults(results || []);
        })
        .catch((error) => {
          console.error('Search error:', error);
          setSearchResults([]);
        })
        .finally(() => setSearching(false));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSendRequest = async (receiverId: string) => {
    try {
      console.log('Sending friend request to:', receiverId);
    const result = await sendFriendRequest(receiverId);
      
    if (result.error) {
        console.error('Friend request error:', result.error);
      Alert.alert('Error', result.error.message || 'Failed to send friend request');
    } else {
        console.log('Friend request sent successfully');
      Alert.alert('Success', 'Friend request sent!');
        
      // Refresh search results to remove the user
      if (searchQuery.trim()) {
          const refreshedResults = await searchUsers(searchQuery);
          setSearchResults(refreshedResults || []);
        }
      }
    } catch (error) {
      console.error('Error in handleSendRequest:', error);
      Alert.alert('Error', 'Failed to send friend request');
    }
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userItem}>
      <View style={styles.avatarContainer}>
        <UserAvatar user={item} size={50} style={styles.avatar} />
        {(item.isOnline || item.status === 'online') && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.userInfo}>
        <ThemedText style={styles.userName}>{item.displayName}</ThemedText>
        <ThemedText style={styles.userUsername}>@{item.username}</ThemedText>
        {item.bio && (
          <ThemedText style={styles.userBio} numberOfLines={2}>
            {item.bio}
          </ThemedText>
        )}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => handleSendRequest(item.id)}
      >
        <Ionicons name="person-add-outline" size={20} color="#FF6B35" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color="#ccc" />
      <ThemedText style={styles.emptyTitle}>
        {searchQuery.trim() ? 'No users found' : 'Search for users'}
      </ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {searchQuery.trim() 
          ? 'Try searching with a different username or display name'
          : 'Enter a username or display name to find friends'
        }
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Search Users</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or display name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <ThemedText style={styles.loadingText}>Searching...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            searchResults.length === 0 ? styles.emptyContainer : undefined
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#888',
    lineHeight: 18,
  },
  addButton: {
    padding: 8,
  },
}); 