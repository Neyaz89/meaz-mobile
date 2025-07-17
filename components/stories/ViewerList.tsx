import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// TODO: Add avatars, animated list, search/filter
export interface ViewerListProps {
  viewers: { id: string; name: string; avatar: string }[];
}
export const ViewerList: React.FC<ViewerListProps> = ({ viewers }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Viewed by:</Text>
      {viewers.map((v) => (
        <View key={v.id} style={styles.viewerRow}>
          {/* TODO: Add avatar */}
          <Text style={styles.name}>{v.name}</Text>
        </View>
      ))}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  name: { marginLeft: 8, color: '#333' },
}); 