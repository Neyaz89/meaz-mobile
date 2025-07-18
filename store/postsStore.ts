import { create } from 'zustand';
import { supabase, uploadFile } from '../lib/supabase';

// Types for media asset and post
export interface MediaAsset {
  uri: string;
  type: string;
  fileName?: string;
}

export interface PostUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  media: Array<{ type: string; url: string }>;
  caption: string;
  privacy: string;
  created_at: string;
  user: PostUser;
}

interface PostsState {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  fetchPosts: () => Promise<void>;
  subscribeToPosts: () => any;
  createPost: (mediaAssets: MediaAsset[], caption: string, privacy?: string) => Promise<void>;
  removePost: (postId: string) => void;
  clearError: () => void;
}

export const usePostsStore = create<PostsState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  // Fetch all posts
  fetchPosts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, user:users(id, display_name, username, avatar_url)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ posts: (data as Post[]) || [], isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error), isLoading: false });
    }
  },

  // Real-time subscription for posts
  subscribeToPosts: () => {
    const channel = supabase
      .channel('posts:all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (_payload: any) => {
        get().fetchPosts();
      })
      .subscribe();
    return channel;
  },

  // Create a new post (with media upload)
  createPost: async (mediaAssets: MediaAsset[], caption: string, privacy = 'friends') => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      if (!mediaAssets || mediaAssets.length === 0) throw new Error('No media selected');
      // Upload each media file
      const uploadedMedia: { type: string; url: string }[] = [];
      for (const asset of mediaAssets) {
        const ext = asset.fileName ? asset.fileName.split('.').pop() : asset.uri.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `posts/${user.id}/${fileName}`;
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const publicUrl = await uploadFile(blob, path);
        uploadedMedia.push({ type: asset.type && asset.type.startsWith('video') ? 'video' : 'image', url: publicUrl });
      }
      // Optimistically add post
      const optimisticPost: Post = {
        id: 'optimistic_' + Date.now(),
        user_id: user.id,
        media: uploadedMedia,
        caption,
        privacy,
        created_at: new Date().toISOString(),
        user: {
          id: user.id,
          display_name: user.user_metadata?.display_name || user.user_metadata?.username || user.email || 'You',
          username: user.user_metadata?.username || '',
          avatar_url: user.user_metadata?.avatar_url || null,
        },
      };
      set(state => ({ posts: [optimisticPost, ...state.posts] }));
      // Insert post in Supabase
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        media: uploadedMedia,
        caption,
        privacy,
      });
      if (error) throw error;
      set({ isLoading: false });
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : String(error), isLoading: false });
    }
  },

  // Remove a post from local state (for optimistic delete)
  removePost: (postId: string) => {
    set(state => ({ posts: state.posts.filter((p: Post) => p.id !== postId) }));
  },

  // Clear error
  clearError: () => set({ error: null }),
})); 