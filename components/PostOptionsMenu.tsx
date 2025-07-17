import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const PostOptionsMenu = ({ visible, onClose, onEdit, onDelete, onReport, onMute, onFollow, onBlock, onAddToStory, isOwnPost }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.menu}>
          {isOwnPost && <TouchableOpacity style={styles.menuItem} onPress={onEdit}><Text>Edit</Text></TouchableOpacity>}
          {isOwnPost && <TouchableOpacity style={styles.menuItem} onPress={onDelete}><Text style={{ color: '#e74c3c' }}>Delete</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.menuItem} onPress={onReport}><Text>Report</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onMute}><Text>Mute User</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onFollow}><Text>Follow/Unfollow</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onBlock}><Text>Block User</Text></TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={onAddToStory}><Text>Add to Story</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minWidth: 220,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
});

export default PostOptionsMenu; 