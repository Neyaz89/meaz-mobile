import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { updateUserProfile } from '../../lib/supabase';
import { useToast } from '../ui/Toast';

export interface PrivacyControlsProps {
  userId: string;
  privacy: any;
  setPrivacy: (p: any) => void;
}
export const PrivacyControls: React.FC<PrivacyControlsProps> = ({ userId, privacy, setPrivacy }) => {
  const toast = useToast();
  const handleToggle = (key: string) => setPrivacy({ ...privacy, [key]: !privacy[key] });
  const handleSave = async () => {
    try {
      await updateUserProfile(userId, { privacy_settings: privacy });
      toast.success('Privacy settings updated!');
    } catch (e) {
      toast.error('Failed to update privacy settings');
    }
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy Controls</Text>
      <View style={styles.row}>
        <Text style={styles.text}>Show Last Seen</Text>
        <Switch value={!!privacy.showLastSeen} onValueChange={() => handleToggle('showLastSeen')} />
      </View>
      <View style={styles.row}>
        <Text style={styles.text}>Show Status</Text>
        <Switch value={!!privacy.showStatus} onValueChange={() => handleToggle('showStatus')} />
      </View>
      <View style={styles.row}>
        <Text style={styles.text}>Show Email</Text>
        <Switch value={!!privacy.showEmail} onValueChange={() => handleToggle('showEmail')} />
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  text: { color: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 },
  saveBtn: { backgroundColor: '#FF6B35', borderRadius: 8, padding: 10, marginTop: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold' },
}); 