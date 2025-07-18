import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { uploadFileWithRetry } from '../lib/supabase';

export interface ImageUploadHook {
  isUploading: boolean;
  pickImage: (options?: ImagePicker.ImagePickerOptions) => Promise<string | null>;
  pickMultipleImages: (options?: ImagePicker.ImagePickerOptions) => Promise<string[]>;
  takePhoto: (options?: ImagePicker.ImagePickerOptions) => Promise<string | null>;
  uploadImage: (uri: string, path: string) => Promise<string>;
}

export const useImageUpload = (): ImageUploadHook => {
  const [isUploading, setIsUploading] = useState(false);

  const requestPermissions = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Media library permission is required to select images.',
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

  const requestCameraPermissions = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera permission is required to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Camera permission request failed:', error);
      return false;
    }
  }, []);

  const pickImage = useCallback(async (options?: ImagePicker.ImagePickerOptions): Promise<string | null> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image');
      return null;
    }
  }, [requestPermissions]);

  const pickMultipleImages = useCallback(async (options?: ImagePicker.ImagePickerOptions): Promise<string[]> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return [];

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets) {
        return result.assets.map(asset => asset.uri);
      }
      return [];
    } catch (error) {
      console.error('Failed to pick images:', error);
      Alert.alert('Error', 'Failed to select images');
      return [];
    }
  }, [requestPermissions]);

  const takePhoto = useCallback(async (options?: ImagePicker.ImagePickerOptions): Promise<string | null> => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      return null;
    }
  }, [requestCameraPermissions]);

  const uploadImage = useCallback(async (uri: string, path: string): Promise<string> => {
    setIsUploading(true);
    try {
      const publicUrl = await uploadFileWithRetry(uri, path);
      return publicUrl;
    } catch (error) {
      console.error('Failed to upload image:', error);
      throw new Error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    isUploading,
    pickImage,
    pickMultipleImages,
    takePhoto,
    uploadImage,
  };
};