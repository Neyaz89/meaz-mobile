import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export type MediaAsset = {
  uri: string;
  type: string;
  fileName?: string;
};

interface AlbumCreateModalProps {
  visible: boolean;
  onClose: () => void;
  onPickMedia: () => void;
  onLaunchCamera: () => void;
  onRemoveMedia: (index: number) => void;
  onChangeTitle: (title: string) => void;
  onChangeDescription: (desc: string) => void;
  onSubmit: () => void;
  uploading: boolean;
  media: MediaAsset[];
  title: string;
  description: string;
  feedback?: string;
}

export default function AlbumCreateModal({
  visible,
  onClose,
  onPickMedia,
  onLaunchCamera,
  onRemoveMedia,
  onChangeTitle,
  onChangeDescription,
  onSubmit,
  uploading,
  media,
  title,
  description,
  feedback,
}: AlbumCreateModalProps) {
  const titleInputRef = useRef<TextInput>(null);
  const descInputRef = useRef<TextInput>(null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
      accessible
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Drag handle */}
          <View style={styles.handle} accessibilityLabel="Drag handle" />
          <Text style={styles.title}>Create Album</Text>

          {/* Album title */}
          <TextInput
            ref={titleInputRef}
            style={styles.input}
            placeholder="Album title"
            value={title}
            onChangeText={onChangeTitle}
            maxLength={60}
            accessibilityLabel="Album title"
            returnKeyType="next"
          />

          {/* Album description */}
          <TextInput
            ref={descInputRef}
            style={[styles.input, { minHeight: 40 }]}
            placeholder="Description (optional)"
            value={description}
            onChangeText={onChangeDescription}
            maxLength={200}
            accessibilityLabel="Album description"
            multiline
            returnKeyType="done"
          />

          {/* Media grid */}
          <FlatList
            data={media}
            horizontal
            keyExtractor={(_, i) => i.toString()}
            style={{ marginBottom: 12, minHeight: 70 }}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item, index }) => (
              <View style={styles.mediaThumbContainer}>
                {item.type.startsWith('video') ? (
                  <View style={styles.videoThumb}>
                    <Ionicons name="videocam" size={32} color="#fff" style={{ position: 'absolute', top: 18, left: 18 }} />
                    <Image source={{ uri: item.uri }} style={styles.mediaThumb} resizeMode="cover" />
                  </View>
                ) : (
                  <Image source={{ uri: item.uri }} style={styles.mediaThumb} resizeMode="cover" />
                )}
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => onRemoveMedia(index)}
                  accessibilityLabel="Remove media"
                >
                  <Ionicons name="close-circle" size={22} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyMedia}>
                <Ionicons name="image-outline" size={36} color="#bbb" />
                <Text style={{ color: '#bbb', fontSize: 14 }}>No media selected</Text>
              </View>
            }
          />

          {/* Option buttons */}
          <View style={styles.optionsRow}>
            <TouchableOpacity style={styles.optionBtn} onPress={onPickMedia} accessibilityLabel="Pick from gallery">
              <Ionicons name="images" size={24} color="#007AFF" />
              <Text style={styles.optionLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionBtn} onPress={onLaunchCamera} accessibilityLabel="Open camera">
              <Ionicons name="camera" size={24} color="#007AFF" />
              <Text style={styles.optionLabel}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Feedback and submit */}
          {feedback ? (
            <Text style={[styles.feedback, feedback.includes('fail') || feedback.includes('error') ? styles.feedbackError : styles.feedbackSuccess]}>{feedback}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.submitBtn, uploading && { backgroundColor: '#ccc' }]}
            onPress={onSubmit}
            disabled={uploading}
            accessibilityLabel="Create Album"
          >
            {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Album</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close modal">
            <Ionicons name="close" size={28} color="#888" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, padding: 20, alignItems: 'center', position: 'relative' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#eee', marginBottom: 12 },
  title: { fontWeight: 'bold', fontSize: 20, marginBottom: 10, color: '#222' },
  input: { backgroundColor: '#f2f2f2', borderRadius: 8, padding: 10, fontSize: 15, width: '100%', marginBottom: 10 },
  mediaThumbContainer: { marginRight: 10, position: 'relative' },
  mediaThumb: { width: 60, height: 60, borderRadius: 8 },
  videoThumb: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' },
  removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 12, padding: 2, zIndex: 2 },
  emptyMedia: { width: 80, height: 60, borderRadius: 8, backgroundColor: '#f2f2f2', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  optionsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  optionBtn: { alignItems: 'center', marginHorizontal: 16 },
  optionLabel: { color: '#007AFF', fontSize: 12, marginTop: 2 },
  feedback: { marginBottom: 8, fontSize: 14, textAlign: 'center' },
  feedbackError: { color: '#e74c3c' },
  feedbackSuccess: { color: '#007AFF' },
  submitBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32, marginBottom: 8, width: '100%', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10 },
}); 