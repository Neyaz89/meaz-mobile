import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Modal, Platform, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { supabase, updateUserProfile } from '../../lib/supabase';
import { useToast } from '../ui/Toast';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    console.log('Toast:', message);
  }
}

interface ProfileCustomizerProps {
  user: any;
  profileImage: string | null;
  setProfileImage: (uri: string | null) => void;
  bio: string;
  setBio: (bio: string) => void;
  status: string;
  setStatus: (status: string) => void;
  privacy: any;
  setPrivacy: (privacy: any) => void;
  theme: any;
  setTheme: (theme: any) => void;
  onSave: () => void;
  onClose: () => void;
}

export const ProfileCustomizer: React.FC<ProfileCustomizerProps> = ({ user, profileImage, setProfileImage, bio, setBio, status, setStatus, privacy, setPrivacy, theme, setTheme, onSave, onClose }) => {
  const [avatarUrl, setAvatarUrl] = useState<string|null>(null);
  const [avatarItems, setAvatarItems] = useState<any[]>([]);
  const [unlockedItems, setUnlockedItems] = useState<any[]>([]);
  const [selectedColor, setSelectedColor] = useState(theme?.primary || '#00FFF7');
  const [selectedFont, setSelectedFont] = useState(theme?.fontFamily || 'System');
  const toast = useToast();

  const fetchAvatarItems = async () => {
    const { data } = await supabase.from('avatar_items').select('*');
    setAvatarItems(data || []);
  };
  const fetchUnlockedItems = async () => {
    const currentUser = user;
    if (!currentUser) return;
    const { data } = await supabase.from('user_avatar_items').select('avatar_item_id').eq('user_id', currentUser.id);
    setUnlockedItems(data?.map((d: any) => d.avatar_item_id) || []);
  };

  useEffect(() => { fetchAvatarItems(); fetchUnlockedItems(); }, []);

  const handleSave = async () => {
    try {
      await updateUserProfile(user.id, {
        avatar_url: avatarUrl || profileImage,
        theme: { ...theme, primary: selectedColor, fontFamily: selectedFont },
      });
      toast.success('Profile customization saved!');
      onSave();
    } catch (e) {
      toast.error('Failed to save customization');
    }
  };

  // TODO: Add avatar upload, theme picker, privacy toggles, etc.
  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Edit Profile</Text>
          {/* Avatar customization UI */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image source={{ uri: (avatarUrl || profileImage) ?? '' }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} />
            <FlatList
              data={avatarItems}
              horizontal
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity disabled={!unlockedItems.includes(item.id)} onPress={() => setAvatarUrl(item.image_url)} style={{ opacity: unlockedItems.includes(item.id) ? 1 : 0.3, marginRight: 8 }}>
                  <Image source={{ uri: item.image_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  <Text style={{ color: '#fff', fontSize: 10, textAlign: 'center' }}>{item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ marginBottom: 8 }}
            />
            <Text style={{ color: '#00FFF7', fontSize: 12 }}>Unlock more items by playing games!</Text>
          </View>
          {/* Theme picker */}
          <Text style={{ color: '#00FFF7', fontWeight: 'bold', marginBottom: 4 }}>Theme Color</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {['#00FFF7', '#FF6B35', '#4cd137', '#888', '#23263A'].map(color => (
              <TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color, marginRight: 8, borderWidth: selectedColor === color ? 2 : 0, borderColor: '#fff' }} />
            ))}
          </View>
          <Text style={{ color: '#00FFF7', fontWeight: 'bold', marginBottom: 4 }}>Font</Text>
          <View style={{ flexDirection: 'row', marginBottom: 12 }}>
            {['System', 'serif', 'monospace', 'sans-serif'].map(font => (
              <TouchableOpacity key={font} onPress={() => setSelectedFont(font)} style={{ marginRight: 12 }}>
                <Text style={{ color: selectedFont === font ? '#00FFF7' : '#fff', fontFamily: font }}>{font}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Bio"
            value={bio}
            onChangeText={setBio}
            maxLength={120}
          />
          <TextInput
            style={styles.input}
            placeholder="Status (online, away, busy, offline)"
            value={status}
            onChangeText={setStatus}
          />
          {/* TODO: Add avatar upload, theme picker, privacy toggles, etc. */}
          <View style={styles.row}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Ionicons name="checkmark" size={22} color="#fff" />
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#fff" />
              <Text style={styles.saveText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#181A20', borderRadius: 20, padding: 24, width: 320, alignItems: 'center' },
  title: { color: '#00FFF7', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#23263A', color: '#00FFF7', borderRadius: 12, padding: 12, marginBottom: 14, fontSize: 16, width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00FFF7', borderRadius: 12, padding: 12, marginRight: 8 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F87171', borderRadius: 12, padding: 12 },
  saveText: { color: '#fff', fontWeight: 'bold', marginLeft: 6 },
}); 