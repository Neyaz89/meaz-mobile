import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, FlatList, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ThemedText } from '../ThemedText';

const AlbumsSection = () => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [comments, setComments] = useState<any[]>([]);
  const [reactions, setReactions] = useState<any[]>([]);
  const [newMediaCount, setNewMediaCount] = useState(0);

  const fetchAlbums = async () => {
    const { data } = await supabase.from('albums').select('*').order('created_at', { ascending: false });
    setAlbums(data || []);
  };

  const fetchMedia = async (albumId: any) => {
    const { data } = await supabase.from('album_media').select('*').eq('album_id', albumId);
    setMedia(data || []);
  };

  const fetchComments = async (mediaId: any) => {
    const { data } = await supabase.from('album_comments').select('*').eq('album_id', selectedAlbum?.id);
    setComments(data || []);
  };
  const fetchReactions = async (mediaId: any) => {
    const { data } = await supabase.from('album_reactions').select('*').eq('album_media_id', mediaId);
    setReactions(data || []);
  };
  const fetchNewMediaCount = async () => {
    setNewMediaCount(2);
  };

  useEffect(() => { 
    fetchAlbums();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => { fetchNewMediaCount(); }, [albums]);

  const handleAddMedia = async () => {
    if (!selectedAlbum) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      const fileName = `${Date.now()}_${file.fileName || 'media'}`;
      await supabase.storage.from('meaz-storage').upload(fileName, { uri: file.uri, type: file.type, name: fileName });
      await supabase.from('album_media').insert({ album_id: selectedAlbum.id, media_url: fileName, type: file.type });
      fetchMedia(selectedAlbum.id);
    }
  };

  const handleAddComment = async (mediaId: any, comment: string) => {
    await supabase.from('album_comments').insert({ album_id: selectedAlbum.id, comment });
    fetchComments(mediaId);
  };
  const handleAddReaction = async (mediaId: any, reaction: string) => {
    await supabase.from('album_reactions').insert({ album_media_id: mediaId, reaction });
    fetchReactions(mediaId);
  };

  const renderAlbumItem = ({ item }: { item: any }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity 
        onPress={() => { setSelectedAlbum(item); fetchMedia(item.id); }}
        style={{ marginRight: 15, width: 120 }}
      >
        <LinearGradient
          colors={['#9b59b6', '#8e44ad']}
          style={{
            height: 120,
            borderRadius: 15,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons name="images" size={40} color="white" />
          <ThemedText style={{ color: 'white', fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>
            {item.name}
          </ThemedText>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  function getPublicUrlSafe(url: string): string {
    const result = supabase.storage.from('meaz-storage').getPublicUrl(url).data.publicUrl;
    return typeof result === 'string' ? result : '';
  }

  const renderMediaItem = ({ item }: { item: any }) => (
    <View style={{ marginRight: 10, marginBottom: 10 }}>
      <Image 
        source={{ uri: getPublicUrlSafe(item.media_url) as string }} 
        style={{ 
          width: 80, 
          height: 80, 
          borderRadius: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4
        }}
      />
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {['like','love','laugh','wow','sad','angry'].map(r => (
          <TouchableOpacity key={r} onPress={() => handleAddReaction(item.id, r)}>
            <Text style={{ fontSize: 16 }}>{r === 'like' ? '👍' : r === 'love' ? '❤️' : r === 'laugh' ? '😂' : r === 'wow' ? '😮' : r === 'sad' ? '😢' : '😡'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={comments.filter((c: any) => c.album_id === selectedAlbum.id)}
        keyExtractor={(c: any) => c.id}
        renderItem={({ item: c }: { item: any }) => (
          <Text style={{ fontSize: 12, color: '#333' }}>{c.comment}</Text>
        )}
        style={{ maxHeight: 40 }}
      />
      <TextInput placeholder="Add comment..." onSubmitEditing={e => handleAddComment(item.id, e.nativeEvent.text)} style={{ backgroundColor: '#eee', borderRadius: 8, padding: 4, fontSize: 12, marginTop: 2 }} />
    </View>
  );

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <View>
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#2c3e50' }}>
            Group Albums
          </ThemedText>
          <ThemedText style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            Share memories together
          </ThemedText>
        </View>
        {selectedAlbum && (
          <TouchableOpacity 
            onPress={handleAddMedia}
            style={{
              backgroundColor: '#9b59b6',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            <Ionicons name="add" size={16} color="white" style={{ marginRight: 4 }} />
            <Text style={{ color: 'white', fontWeight: '600' }}>Add Media</Text>
            {newMediaCount > 0 && <View style={{ backgroundColor: 'red', borderRadius: 8, paddingHorizontal: 6, marginLeft: 6 }}><Text style={{ color: 'white', fontSize: 10 }}>{newMediaCount}</Text></View>}
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={albums}
        horizontal
        keyExtractor={(item: any) => item.id}
        renderItem={renderAlbumItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5 }}
      />
      {selectedAlbum && (
        <View style={{ marginTop: 20 }}>
          <LinearGradient
            colors={['#ecf0f1', '#bdc3c7']}
            style={{
              borderRadius: 15,
              padding: 15,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 15 }}>
              {selectedAlbum.name} Media
            </ThemedText>
            <FlatList
              data={media}
              horizontal
              keyExtractor={(item: any) => item.id}
              renderItem={renderMediaItem}
              showsHorizontalScrollIndicator={false}
            />
          </LinearGradient>
        </View>
      )}
    </View>
  );
};

export default AlbumsSection; 