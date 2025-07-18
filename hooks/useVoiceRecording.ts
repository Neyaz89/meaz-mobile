import { Audio } from 'expo-av';
import { useCallback, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { uploadFileWithRetry } from '../lib/supabase';

export interface VoiceRecordingHook {
  isRecording: boolean;
  isUploading: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  uploadVoiceNote: (uri: string, path: string) => Promise<string>;
}

export const useVoiceRecording = (): VoiceRecordingHook => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const requestPermissions = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record voice messages.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start voice recording');
      setIsRecording(false);
    }
  }, [requestPermissions]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        console.warn('No active recording to stop');
        return null;
      }

      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();
      
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });

      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop voice recording');
      setIsRecording(false);
      return null;
    }
  }, []);

  const uploadVoiceNote = useCallback(async (uri: string, path: string): Promise<string> => {
    setIsUploading(true);
    try {
      const publicUrl = await uploadFileWithRetry(uri, path);
      return publicUrl;
    } catch (error) {
      console.error('Failed to upload voice note:', error);
      throw new Error('Failed to upload voice note');
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isRecording,
    isUploading,
    startRecording,
    stopRecording,
    uploadVoiceNote,
  };
};