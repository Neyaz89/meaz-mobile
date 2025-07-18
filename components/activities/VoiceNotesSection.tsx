import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { RecordingOptionsPresets } from 'expo-av/build/Audio/RecordingConstants';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { subscribeToVoiceNotes, supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const VoiceNotesSection = () => {
  const [voiceNotes, setVoiceNotes] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [waveform, setWaveform] = useState<number[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const currentPlayingNote = voiceNotes.find((item: any) => item.id === playingId);
  const currentUrl = currentPlayingNote ? supabase.storage.from('meaz-storage').getPublicUrl(currentPlayingNote.url).data.publicUrl : undefined;

  // Fetch all voice notes for the user
  const fetchVoiceNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('voice_notes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      setVoiceNotes(data || []);
    } catch (err) {
      setError('Failed to load voice notes.');
    }
    setLoading(false);
  };

  useEffect(() => { 
    fetchVoiceNotes();
    let subscription: any;
    let isMounted = true;
    (async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        subscription = subscribeToVoiceNotes(user.id, (payload: any) => {
          if (isMounted) fetchVoiceNotes();
        });
      }
    })();
    return () => {
      isMounted = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      } else if (subscription && typeof supabase.removeChannel === 'function') {
        supabase.removeChannel(subscription);
      }
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') throw new Error('Microphone permission not granted');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
        ])
      ).start();
    } catch (err) {
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  // Stop recording and upload
  const stopRecording = async () => {
    setUploading(true);
    try {
      if (!recording) throw new Error('No recording in progress');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      pulseAnim.stopAnimation();
      if (!uri) throw new Error('No recording URI');
      const fileName = `${Date.now()}_voicenote.m4a`;
      const { data, error } = await supabase.storage.from('meaz-storage').upload(fileName, { uri, type: 'audio/m4a', name: fileName } as any);
      if (error) throw error;
      // Save reference in DB
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');
      await supabase.from('voice_notes').insert({ user_id: user.id, url: fileName });
      fetchVoiceNotes();
    } catch (err) {
      setIsRecording(false);
      Alert.alert('Error', 'Failed to upload voice note.');
    }
    setUploading(false);
  };

  // Play a voice note
  const playVoiceNote = async (item: any) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      setPlayingId(item.id);
      const url = supabase.storage.from('meaz-storage').getPublicUrl(item.url).data.publicUrl;
      const { sound: newSound } = await Audio.Sound.createAsync({ uri: url });
      setSound(newSound);
      await newSound.playAsync();
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          newSound.unloadAsync();
        }
      });
    } catch (err) {
      setPlayingId(null);
      Alert.alert('Error', 'Failed to play voice note.');
    }
  };

  // Delete a voice note
  const deleteVoiceNote = async (item: any) => {
    Alert.alert('Delete Voice Note', 'Are you sure you want to delete this voice note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('voice_notes').delete().eq('id', item.id);
        fetchVoiceNotes();
      }}
    ]);
  };

  // Render waveform (placeholder, can be replaced with real waveform data)
  const renderWaveform = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8 }}>
      {[...Array(30)].map((_, i) => (
        <View key={i} style={{ width: 2, height: Math.random() * 20 + 10, backgroundColor: '#fff', marginHorizontal: 1, borderRadius: 1 }} />
      ))}
    </View>
  );

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Voice Notes
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            Record and share audio
          </ThemedText>
        </View>
      </View>
      <LinearGradient
        colors={['#e74c3c', '#c0392b']}
        style={{
          borderRadius: 20,
          padding: 20,
          marginBottom: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 15 }}>
            {isRecording ? 'Recording...' : 'Ready to Record'}
          </ThemedText>
          {renderWaveform()}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={startRecording}
              disabled={isRecording || uploading}
              style={{
                backgroundColor: isRecording ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                width: 60,
                height: 60,
                borderRadius: 30,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 20,
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.5)',
              }}
            >
              <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                <Ionicons name="mic" size={28} color="white" />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={stopRecording}
              disabled={!isRecording || uploading}
              style={{
                backgroundColor: !isRecording ? 'rgba(255,255,255,0.3)' : '#e74c3c',
                width: 60,
                height: 60,
                borderRadius: 30,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.5)',
              }}
            >
              <Ionicons name="stop" size={28} color="white" />
            </TouchableOpacity>
          </View>
          {uploading && <ActivityIndicator color="#fff" style={{ marginTop: 10 }} />}
        </View>
      </LinearGradient>
      {error && <Text style={{ color: '#e74c3c', textAlign: 'center', marginBottom: 10 }}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#e74c3c" style={{ marginVertical: 20 }} />
      ) : (
        <FlatList
          data={voiceNotes}
          keyExtractor={item => item.id}
          renderItem={({ item }: { item: any }) => (
              <LinearGradient
                colors={['#3498db', '#2980b9']}
                style={{
                  borderRadius: 15,
                  padding: 15,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
              <TouchableOpacity onPress={() => playVoiceNote(item)} style={{ marginRight: 15 }}>
                <Ionicons name={item.id === playingId ? 'pause-circle' : 'play-circle'} size={28} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                    Voice Note
                  </ThemedText>
                  <ThemedText style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                    {item.created_at}
                  </ThemedText>
                </View>
                <TouchableOpacity onPress={() => deleteVoiceNote(item)} style={{ marginLeft: 10 }}>
                  <Ionicons name="trash" size={22} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default VoiceNotesSection; 