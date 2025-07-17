import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { StoriesState, Story, StoryContent } from '../types';

export const useStoriesStore = create<StoriesState>((set, get) => ({
  stories: [],
  myStories: [],
  isLoading: false,
  error: null,

  // Load stories for current user
  loadMyStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data: stories, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          content,
          viewers,
          privacy,
          is_highlight,
          highlight_title,
          music,
          location,
          mentions,
          hashtags,
          created_at,
          expires_at,
          users (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedStories = stories?.map(story => ({
        id: story.id,
        userId: story.user_id,
        content: story.content || [],
        viewers: story.viewers || [],
        privacy: story.privacy,
        isHighlight: story.is_highlight,
        highlightTitle: story.highlight_title,
        music: story.music,
        location: story.location,
        mentions: story.mentions || [],
        hashtags: story.hashtags || [],
        createdAt: new Date(story.created_at),
        expiresAt: new Date(story.expires_at),
        user: story.users,
      })) || [];

      set({ myStories: formattedStories, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load stories from friends
  loadFriendsStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data: stories, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          content,
          viewers,
          privacy,
          is_highlight,
          highlight_title,
          music,
          location,
          mentions,
          hashtags,
          created_at,
          expires_at,
          users (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .neq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedStories = stories?.map(story => ({
        id: story.id,
        userId: story.user_id,
        content: story.content || [],
        viewers: story.viewers || [],
        privacy: story.privacy,
        isHighlight: story.is_highlight,
        highlightTitle: story.highlight_title,
        music: story.music,
        location: story.location,
        mentions: story.mentions || [],
        hashtags: story.hashtags || [],
        createdAt: new Date(story.created_at),
        expiresAt: new Date(story.expires_at),
        user: story.users,
      })) || [];

      set({ stories: formattedStories, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  // Create a new story
  createStory: async (content: StoryContent[], privacy: 'public' | 'friends' | 'close_friends' | 'custom' = 'friends', options?: {
    isHighlight?: boolean;
    highlightTitle?: string;
    music?: any;
    location?: any;
    mentions?: string[];
    hashtags?: string[];
  }) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data: story, error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          content,
          privacy,
          is_highlight: options?.isHighlight || false,
          highlight_title: options?.highlightTitle,
          music: options?.music,
          location: options?.location,
          mentions: options?.mentions || [],
          hashtags: options?.hashtags || [],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        })
        .select()
        .single();

      if (error) throw error;

      const newStory: Story = {
        id: story.id,
        userId: story.user_id,
        content: story.content,
        viewers: story.viewers || [],
        privacy: story.privacy,
        isHighlight: story.is_highlight,
        highlightTitle: story.highlight_title,
        music: story.music,
        location: story.location,
        mentions: story.mentions || [],
        hashtags: story.hashtags || [],
        createdAt: new Date(story.created_at),
        expiresAt: new Date(story.expires_at),
        user: { 
          id: user.id, 
          email: user.email || '',
          username: user.user_metadata?.username || '',
          displayName: user.user_metadata?.display_name || '',
          avatar: '',
          status: 'online',
          lastSeen: new Date(),
          bio: '',
          phone: '',
          location: '',
          joinedAt: new Date(),
          settings: {},
          theme: {},
          friends: [],
          blockedUsers: [],
          mutedChats: [],
          pinnedChats: [],
          customStickers: [],
          achievements: [],
          streakCount: 0,
          totalMessages: 0,
          favoriteEmojis: [],
          premiumTier: 'free',
          lastActivity: new Date(),
          language: 'en',
          notificationSettings: {},
          privacySettings: {},
        },
      };

      set(state => ({
        myStories: [newStory, ...state.myStories]
      }));

      return newStory;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // View a story
  viewStory: async (storyId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      // Check if already viewed
      const { data: existingView } = await supabase
        .from('story_views')
        .select('id')
        .eq('story_id', storyId)
        .eq('viewer_id', user.id)
        .single();

      if (existingView) return; // Already viewed

      const { data: view, error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          viewer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        stories: state.stories.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              viewers: [...story.viewers, {
                id: view.id,
                storyId: view.story_id,
                viewerId: view.viewer_id,
                viewedAt: new Date(view.viewed_at),
                viewer: { id: user.id, username: user.user_metadata?.username, display_name: user.user_metadata?.display_name },
              }]
            };
          }
          return story;
        }),
        myStories: state.myStories.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              viewers: [...story.viewers, {
                id: view.id,
                storyId: view.story_id,
                viewerId: view.viewer_id,
                viewedAt: new Date(view.viewed_at),
                viewer: { id: user.id, username: user.user_metadata?.username, display_name: user.user_metadata?.display_name },
              }]
            };
          }
          return story;
        })
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },

  // Delete a story
  deleteStory: async (storyId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Remove from local state
      set(state => ({
        myStories: state.myStories.filter(story => story.id !== storyId)
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Add story to highlights
  addToHighlights: async (storyId: string, title: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('stories')
        .update({
          is_highlight: true,
          highlight_title: title,
        })
        .eq('id', storyId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      set(state => ({
        myStories: state.myStories.map(story => 
          story.id === storyId 
            ? { ...story, isHighlight: true, highlightTitle: title }
            : story
        )
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Remove story from highlights
  removeFromHighlights: async (storyId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('stories')
        .update({
          is_highlight: false,
          highlight_title: null,
        })
        .eq('id', storyId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      set(state => ({
        myStories: state.myStories.map(story => 
          story.id === storyId 
            ? { ...story, isHighlight: false, highlightTitle: undefined }
            : story
        )
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Get story analytics
  getStoryAnalytics: async (storyId: string) => {
    try {
      const { data: views, error } = await supabase
        .from('story_views')
        .select(`
          id,
          viewer_id,
          viewed_at,
          users (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('story_id', storyId);

      if (error) throw error;

      return {
        totalViews: views?.length || 0,
        uniqueViews: views?.length || 0,
        views: views?.map(view => ({
          id: view.id,
          viewerId: view.viewer_id,
          viewedAt: new Date(view.viewed_at),
          viewer: view.users,
        })) || [],
      };
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Upload story media
  uploadStoryMedia: async (file: any, type: 'image' | 'video') => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const filePath = `stories/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meaz-storage')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('meaz-storage')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        type,
        duration: type === 'video' ? 10 : 5, // Default durations
      };
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Get stories by user
  getStoriesByUser: async (userId: string) => {
    try {
      const { data: stories, error } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          content,
          viewers,
          privacy,
          is_highlight,
          highlight_title,
          music,
          location,
          mentions,
          hashtags,
          created_at,
          expires_at,
          users (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return stories?.map(story => ({
        id: story.id,
        userId: story.user_id,
        content: story.content || [],
        viewers: story.viewers || [],
        privacy: story.privacy,
        isHighlight: story.is_highlight,
        highlightTitle: story.highlight_title,
        music: story.music,
        location: story.location,
        mentions: story.mentions || [],
        hashtags: story.hashtags || [],
        createdAt: new Date(story.created_at),
        expiresAt: new Date(story.expires_at),
        user: story.users,
      })) || [];
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  // Clear expired stories
  clearExpiredStories: () => {
    const now = new Date();
    set(state => ({
      stories: state.stories.filter(story => story.expiresAt > now),
      myStories: state.myStories.filter(story => story.expiresAt > now),
    }));
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Initialize store
  initialize: async () => {
    await Promise.all([
      get().loadMyStories(),
      get().loadFriendsStories(),
    ]);
  },
})); 