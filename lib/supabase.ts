import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';

// Use process.env for Expo/React Native
const supabaseUrl = 'https://orupcxnygtgofvvwhpmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydXBjeG55Z3Rnb2Z2dndocG16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MDY1NDMsImV4cCI6MjA2NzI4MjU0M30.DC6i0QyQlwaKf3ZUBNSLWjXIX_RsHwFtpnzSnQrh1Dw';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your app.json or .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database types for Meaz app - Updated with advanced features
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          status: 'online' | 'away' | 'busy' | 'offline';
          bio: string;
          phone: string | null;
          location: string | null;
          last_seen: string;
          settings: any;
          theme: any;
          achievements: any[];
          streak_count: number;
          total_messages: number;
          favorite_emojis: string[];
          created_at: string;
          updated_at: string;
          is_online: boolean;
          premium_tier: 'free' | 'premium' | 'pro';
          last_activity: string;
          timezone: string | null;
          language: string;
          notification_settings: any;
          privacy_settings: any;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          status?: 'online' | 'away' | 'busy' | 'offline';
          bio?: string;
          phone?: string | null;
          location?: string | null;
          last_seen?: string;
          settings?: any;
          theme?: any;
          achievements?: any[];
          streak_count?: number;
          total_messages?: number;
          favorite_emojis?: string[];
          created_at?: string;
          updated_at?: string;
          is_online?: boolean;
          premium_tier?: 'free' | 'premium' | 'pro';
          last_activity?: string;
          timezone?: string | null;
          language?: string;
          notification_settings?: any;
          privacy_settings?: any;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string;
          display_name?: string;
          avatar_url?: string | null;
          status?: 'online' | 'away' | 'busy' | 'offline';
          bio?: string;
          phone?: string | null;
          location?: string | null;
          last_seen?: string;
          settings?: any;
          theme?: any;
          achievements?: any[];
          streak_count?: number;
          total_messages?: number;
          favorite_emojis?: string[];
          created_at?: string;
          updated_at?: string;
          is_online?: boolean;
          premium_tier?: 'free' | 'premium' | 'pro';
          last_activity?: string;
          timezone?: string | null;
          language?: string;
          notification_settings?: any;
          privacy_settings?: any;
        };
      };
      friend_requests: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          status?: 'pending' | 'accepted' | 'rejected';
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          from_user_id?: string;
          to_user_id?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      friends: {
        Row: {
          id: string;
          user_id: string;
          friend_id: string;
          status: 'pending' | 'accepted' | 'blocked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          friend_id: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          friend_id?: string;
          status?: 'pending' | 'accepted' | 'blocked';
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          name: string;
          type: 'direct' | 'group' | 'channel' | 'broadcast';
          description: string | null;
          avatar_url: string | null;
          created_by: string | null;
          settings: any;
          customization: any;
          is_archived: boolean;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
          last_message_id: string | null;
          join_link: string | null;
          join_link_expires_at: string | null;
          is_encrypted: boolean;
          encryption_key: string | null;
          auto_delete_timer: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          type?: 'direct' | 'group' | 'channel' | 'broadcast';
          description?: string | null;
          avatar_url?: string | null;
          created_by?: string | null;
          settings?: any;
          customization?: any;
          is_archived?: boolean;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          join_link?: string | null;
          join_link_expires_at?: string | null;
          is_encrypted?: boolean;
          encryption_key?: string | null;
          auto_delete_timer?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'direct' | 'group' | 'channel' | 'broadcast';
          description?: string | null;
          avatar_url?: string | null;
          created_by?: string | null;
          settings?: any;
          customization?: any;
          is_archived?: boolean;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          join_link?: string | null;
          join_link_expires_at?: string | null;
          is_encrypted?: boolean;
          encryption_key?: string | null;
          auto_delete_timer?: number | null;
        };
      };
      chat_members: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          role: 'member' | 'admin' | 'moderator' | 'owner';
          joined_at: string;
          last_read_at: string;
          is_muted: boolean;
          is_pinned: boolean;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          role?: 'member' | 'admin' | 'moderator' | 'owner';
          joined_at?: string;
          last_read_at?: string;
          is_muted?: boolean;
          is_pinned?: boolean;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          role?: 'member' | 'admin' | 'moderator' | 'owner';
          joined_at?: string;
          last_read_at?: string;
          is_muted?: boolean;
          is_pinned?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string | null;
          content: string;
          type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'sticker' | 'gif' | 'poll';
          attachments: any[];
          reply_to: string | null;
          reactions: any[];
          is_edited: boolean;
          is_deleted: boolean;
          is_starred: boolean;
          is_temporary: boolean;
          expires_at: string | null;
          viewed: boolean;
          created_at: string;
          updated_at: string;
          forward_count: number;
          original_sender_id: string | null;
          translation: any;
          encryption_key: string | null;
          is_encrypted: boolean;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id?: string | null;
          content: string;
          type?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'sticker' | 'gif' | 'poll';
          attachments?: any[];
          reply_to?: string | null;
          reactions?: any[];
          is_edited?: boolean;
          is_deleted?: boolean;
          is_starred?: boolean;
          is_temporary?: boolean;
          expires_at?: string | null;
          viewed?: boolean;
          created_at?: string;
          updated_at?: string;
          forward_count?: number;
          original_sender_id?: string | null;
          translation?: any;
          encryption_key?: string | null;
          is_encrypted?: boolean;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string | null;
          content?: string;
          type?: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'sticker' | 'gif' | 'poll';
          attachments?: any[];
          reply_to?: string | null;
          reactions?: any[];
          is_edited?: boolean;
          is_deleted?: boolean;
          is_starred?: boolean;
          is_temporary?: boolean;
          expires_at?: string | null;
          viewed?: boolean;
          created_at?: string;
          updated_at?: string;
          forward_count?: number;
          original_sender_id?: string | null;
          translation?: any;
          encryption_key?: string | null;
          is_encrypted?: boolean;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          reaction: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          reaction: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          reaction?: string;
          created_at?: string;
        };
      };
      polls: {
        Row: {
          id: string;
          message_id: string;
          question: string;
          options: any;
          allow_multiple: boolean;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          question: string;
          options: any;
          allow_multiple?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          question?: string;
          options?: any;
          allow_multiple?: boolean;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          user_id: string;
          selected_options: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          user_id: string;
          selected_options: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          user_id?: string;
          selected_options?: any;
          created_at?: string;
        };
      };
      voice_channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          chat_id: string;
          created_by: string | null;
          max_participants: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          chat_id: string;
          created_by?: string | null;
          max_participants?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          chat_id?: string;
          created_by?: string | null;
          max_participants?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      voice_channel_participants: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          joined_at: string;
          is_muted: boolean;
          is_speaking: boolean;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          joined_at?: string;
          is_muted?: boolean;
          is_speaking?: boolean;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          joined_at?: string;
          is_muted?: boolean;
          is_speaking?: boolean;
        };
      };
      pinned_messages: {
        Row: {
          id: string;
          chat_id: string;
          message_id: string;
          pinned_by: string | null;
          pinned_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          message_id: string;
          pinned_by?: string | null;
          pinned_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          message_id?: string;
          pinned_by?: string | null;
          pinned_at?: string;
        };
      };
      user_blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          blocker_id: string;
          blocked_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          blocker_id?: string;
          blocked_id?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
      user_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          evidence: any;
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_id: string;
          reason: string;
          evidence?: any;
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_id?: string;
          reason?: string;
          evidence?: any;
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description: string | null;
          icon_url: string | null;
          unlocked_at: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_type: string;
          title: string;
          description?: string | null;
          icon_url?: string | null;
          unlocked_at?: string;
          metadata?: any;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_type?: string;
          title?: string;
          description?: string | null;
          icon_url?: string | null;
          unlocked_at?: string;
          metadata?: any;
        };
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          streak_type: string;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          streak_type: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          streak_type?: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          user_id: string | null;
          content: any[];
          viewers: any[];
          privacy: 'public' | 'friends' | 'close_friends' | 'custom';
          is_highlight: boolean;
          highlight_title: string | null;
          music: any | null;
          location: any | null;
          mentions: string[];
          hashtags: string[];
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          content?: any[];
          viewers?: any[];
          privacy?: 'public' | 'friends' | 'close_friends' | 'custom';
          is_highlight?: boolean;
          highlight_title?: string | null;
          music?: any | null;
          location?: any | null;
          mentions?: string[];
          hashtags?: string[];
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          content?: any[];
          viewers?: any[];
          privacy?: 'public' | 'friends' | 'close_friends' | 'custom';
          is_highlight?: boolean;
          highlight_title?: string | null;
          music?: any | null;
          location?: any | null;
          mentions?: string[];
          hashtags?: string[];
          created_at?: string;
          expires_at?: string;
        };
      };
      story_views: {
        Row: {
          id: string;
          story_id: string;
          viewer_id: string;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          viewer_id: string;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          viewer_id?: string;
          viewed_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'friend_request' | 'message' | 'story' | 'mention' | 'like' | 'reaction' | 'system';
          title: string;
          body: string | null;
          data: any;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'friend_request' | 'message' | 'story' | 'mention' | 'like' | 'reaction' | 'system';
          title: string;
          body?: string | null;
          data?: any;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'friend_request' | 'message' | 'story' | 'mention' | 'like' | 'reaction' | 'system';
          title?: string;
          body?: string | null;
          data?: any;
          read?: boolean;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          type: 'login' | 'logout' | 'profile_update' | 'story_post' | 'message_sent' | 'mood_check' | 'game' | 'streak';
          description: string | null;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'login' | 'logout' | 'profile_update' | 'story_post' | 'message_sent' | 'mood_check' | 'game' | 'streak';
          description?: string | null;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'login' | 'logout' | 'profile_update' | 'story_post' | 'message_sent' | 'mood_check' | 'game' | 'streak';
          description?: string | null;
          metadata?: any;
          created_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          caller_id: string;
          receiver_id: string;
          type: 'audio' | 'video';
          status: 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
          started_at: string | null;
          ended_at: string | null;
          duration: string | null;
          created_at: string;
          call_url: string | null;
          recording_url: string | null;
          participants: any;
          call_quality: string | null;
          network_type: string | null;
        };
        Insert: {
          id?: string;
          caller_id: string;
          receiver_id: string;
          type?: 'audio' | 'video';
          status?: 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
          started_at?: string | null;
          ended_at?: string | null;
          duration?: string | null;
          created_at?: string;
          call_url?: string | null;
          recording_url?: string | null;
          participants?: any;
          call_quality?: string | null;
          network_type?: string | null;
        };
        Update: {
          id?: string;
          caller_id?: string;
          receiver_id?: string;
          type?: 'audio' | 'video';
          status?: 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
          started_at?: string | null;
          ended_at?: string | null;
          duration?: string | null;
          created_at?: string;
          call_url?: string | null;
          recording_url?: string | null;
          participants?: any;
          call_quality?: string | null;
          network_type?: string | null;
        };
      };
      snaps: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          media_url: string;
          caption: string | null;
          duration: number;
          viewed: boolean;
          viewed_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          media_url: string;
          caption?: string | null;
          duration?: number;
          viewed?: boolean;
          viewed_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          media_url?: string;
          caption?: string | null;
          duration?: number;
          viewed?: boolean;
          viewed_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      post_comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      post_shares: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      solo_game_sessions: {
        Row: {
          id: string;
          user_id: string;
          game_type: string;
          score: number;
          level: number;
          completed: boolean;
          xp_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_type: string;
          score: number;
          level: number;
          completed: boolean;
          xp_earned: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_type?: string;
          score?: number;
          level?: number;
          completed?: boolean;
          xp_earned?: number;
          created_at?: string;
        };
      };
      solo_leaderboards: {
        Row: {
          id: string;
          user_id: string;
          game_type: string;
          high_score: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_type: string;
          high_score: number;
          last_updated: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          game_type?: string;
          high_score?: number;
          last_updated?: string;
        };
      };
      daily_challenges: {
        Row: {
          id: string;
          user_id: string;
          challenge_type: string;
          assigned_at: string;
          completed_at: string | null;
          score: number;
          status: 'pending' | 'completed' | 'failed';
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_type: string;
          assigned_at: string;
          completed_at?: string | null;
          score: number;
          status?: 'pending' | 'completed' | 'failed';
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_type?: string;
          assigned_at?: string;
          completed_at?: string | null;
          score?: number;
          status?: 'pending' | 'completed' | 'failed';
        };
      };
      spin_rewards: {
        Row: {
          id: string;
          user_id: string;
          reward_type: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reward_type: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reward_type?: string;
          earned_at?: string;
        };
      };
      voice_notes: {
        Row: {
          id: string;
          user_id: string;
          audio_url: string;
          duration: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          audio_url: string;
          duration: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          audio_url?: string;
          duration?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      chat_stats: {
        Row: {
          chat_id: string;
          name: string;
          type: string;
          member_count: number;
          message_count: number;
          last_message_at: string | null;
          messages_today: number;
        };
      };
      user_activity: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          last_activity: string;
          is_online: boolean;
          total_messages: number;
          total_stories: number;
          friend_count: number;
        };
      };
    };
  };
}

// Helper functions for file uploads
export const uploadFile = async (file: any, path: string) => {
  try {
    let fileData;
    
    // Handle different file input types
    if (typeof file === 'string') {
      // File URI from image picker
      const fileInfo = await FileSystem.getInfoAsync(file);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }
      fileData = {
        uri: file,
        type: 'image/jpeg', // Default type
        name: path.split('/').pop() || 'file',
      };
    } else if (file instanceof Blob) {
      fileData = file;
    } else if (file.uri) {
      // File object with URI
      fileData = {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || path.split('/').pop() || 'file',
      };
    } else {
      fileData = file;
    }
    
  const { data, error } = await supabase.storage
    .from('meaz-storage')
      .upload(path, fileData, {
        cacheControl: '3600',
        upsert: true,
      });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('meaz-storage')
    .getPublicUrl(path);
  
  return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const deleteFile = async (path: string) => {
  const { error } = await supabase.storage
    .from('meaz-storage')
    .remove([path]);
  
  if (error) throw error;
};

// Enhanced upload with retry logic
export const uploadFileWithRetry = async (file: any, path: string, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFile(file, path);
    } catch (error) {
      lastError = error;
      console.warn(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
};

// Real-time subscriptions
export const subscribeToMessages = (chatId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`messages:${chatId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    }, callback)
    .subscribe();
};

export const subscribeToFriendRequests = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`friend_requests:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'friend_requests',
      filter: `to_user_id=eq.${userId}`
    }, callback)
    .subscribe();
};

export const subscribeToSnaps = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`snaps:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'snaps',
      filter: `receiver_id=eq.${userId}`
    }, callback)
    .subscribe();
};

export const subscribeToNotifications = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
};

export const subscribeToMessageReactions = (messageId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`reactions:${messageId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_reactions',
      filter: `message_id=eq.${messageId}`
    }, callback)
    .subscribe();
};

export const subscribeToPollVotes = (pollId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`poll_votes:${pollId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'poll_votes',
      filter: `poll_id=eq.${pollId}`
    }, callback)
    .subscribe();
};

export const subscribeToVoiceChannels = (chatId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`voice_channels:${chatId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'voice_channels',
      filter: `chat_id=eq.${chatId}`
    }, callback)
    .subscribe();
};

export const subscribeToVoiceChannelParticipants = (channelId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`voice_participants:${channelId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'voice_channel_participants',
      filter: `channel_id=eq.${channelId}`
    }, callback)
    .subscribe();
}; 

export const subscribeToChatMembers = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`chat_members:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_members',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
}; 

// === POSTS: Likes, Comments, Shares ===

// --- LIKES ---
export const fetchPostLikes = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_likes')
    .select('*, user:users(id, display_name, username, avatar_url)')
    .eq('post_id', postId);
  if (error) throw error;
  return data;
};

export const likePost = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('post_likes')
    .insert({ post_id: postId, user_id: userId });
  if (error) throw error;
};

export const unlikePost = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('post_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const subscribeToPostLikes = (postId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`post_likes:${postId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'post_likes',
      filter: `post_id=eq.${postId}`
    }, callback)
    .subscribe();
};

// --- COMMENTS ---
export const fetchPostComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_comments')
    .select('*, user:users(id, display_name, username, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const addPostComment = async (postId: string, userId: string, content: string) => {
  const { error } = await supabase
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, content });
  if (error) throw error;
};

export const updatePostComment = async (commentId: string, content: string) => {
  const { error } = await supabase
    .from('post_comments')
    .update({ content, is_edited: true })
    .eq('id', commentId);
  if (error) throw error;
};

export const deletePostComment = async (commentId: string, userId: string) => {
  const { error } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const subscribeToPostComments = (postId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`post_comments:${postId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'post_comments',
      filter: `post_id=eq.${postId}`
    }, callback)
    .subscribe();
};

// --- SHARES ---
export const fetchPostShares = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_shares')
    .select('*, user:users(id, display_name, username, avatar_url)')
    .eq('post_id', postId);
  if (error) throw error;
  return data;
};

export const sharePost = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('post_shares')
    .insert({ post_id: postId, user_id: userId });
  if (error) throw error;
};

export const subscribeToPostShares = (postId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`post_shares:${postId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'post_shares',
      filter: `post_id=eq.${postId}`
    }, callback)
    .subscribe();
}; 

// === SAVED POSTS ===
export const savePost = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('saved_posts')
    .insert({ post_id: postId, user_id: userId });
  if (error) throw error;
};

export const unsavePost = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const isPostSaved = async (postId: string, userId: string) => {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', userId);
  if (error) throw error;
  return data && data.length > 0;
};

export const subscribeToSavedPosts = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`saved_posts:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'saved_posts',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
};

// === PINNED POSTS ===
export const pinPost = async (postId: string, userId: string) => {
  // Unpin all user's posts first
  await supabase
    .from('posts')
    .update({ is_pinned: false })
    .eq('user_id', userId);
  // Pin the selected post
  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: true })
    .eq('id', postId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const unpinPost = async (postId: string, userId: string) => {
  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: false })
    .eq('id', postId)
    .eq('user_id', userId);
  if (error) throw error;
};

export const isPostPinned = async (postId: string, userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select('is_pinned')
    .eq('id', postId)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data?.is_pinned === true;
};

// === POST REACTIONS ===
export const reactToPost = async (postId: string, userId: string, emoji: string) => {
  // Remove any existing reaction by this user on this post
  await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);
  // Insert the new reaction
  const { error } = await supabase
    .from('post_reactions')
    .insert({ post_id: postId, user_id: userId, emoji });
  if (error) throw error;
};

export const unreactToPost = async (postId: string, userId: string, emoji: string) => {
  const { error } = await supabase
    .from('post_reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji);
  if (error) throw error;
};

export const fetchPostReactions = async (postId: string) => {
  const { data, error } = await supabase
    .from('post_reactions')
    .select('*')
    .eq('post_id', postId);
  if (error) throw error;
  // Group by emoji
  const grouped: { [emoji: string]: { emoji: string; count: number; users: string[] } } = {};
  data.forEach((r: any) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.user_id);
  });
  return Object.values(grouped);
};

export const subscribeToPostReactions = (postId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`post_reactions:${postId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'post_reactions',
      filter: `post_id=eq.${postId}`
    }, callback)
    .subscribe();
};

// === POST REPORTS ===
export const reportPost = async (postId: string, userId: string, reason: string) => {
  const { error } = await supabase
    .from('post_reports')
    .insert({ post_id: postId, user_id: userId, reason });
  if (error) throw error;
};

// === TRANSLATIONS ===
export const fetchPostTranslation = async (postId: string, lang: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select('translations')
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data?.translations?.[lang] || null;
};

export const updatePostTranslation = async (postId: string, lang: string, translation: string) => {
  // Fetch current translations
  const { data, error } = await supabase
    .from('posts')
    .select('translations')
    .eq('id', postId)
    .single();
  if (error) throw error;
  const translations = data?.translations || {};
  translations[lang] = translation;
  const { error: updateError } = await supabase
    .from('posts')
    .update({ translations })
    .eq('id', postId);
  if (updateError) throw updateError;
};

// === PROFILE ===
export const fetchUserProfile = async (userIdOrUsername: string) => {
  const isUuid = /^[0-9a-fA-F-]{36}$/.test(userIdOrUsername);
  const query = supabase
    .from('users')
    .select('*')
    .eq(isUuid ? 'id' : 'username', userIdOrUsername)
    .single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId: string, updates: Partial<Database['public']['Tables']['users']['Update']>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

// === FOLLOWERS ===
export const followUser = async (followerId: string, followedId: string) => {
  const { data, error } = await supabase
    .from('followers')
    .insert({ follower_id: followerId, followed_id: followedId });
  if (error) throw error;
  return data;
};

export const unfollowUser = async (followerId: string, followedId: string) => {
  const { data, error } = await supabase
    .from('followers')
    .delete()
    .eq('follower_id', followerId)
    .eq('followed_id', followedId);
  if (error) throw error;
  return data;
};

export const fetchFollowers = async (userId: string) => {
  // Returns users who follow the given user
  const { data, error } = await supabase
    .from('followers')
    .select('follower_id, user:users!followers_follower_id_fkey(id, username, display_name, avatar_url)')
    .eq('followed_id', userId);
  if (error) throw error;
  return data;
};

export const fetchFollowing = async (userId: string) => {
  // Returns users whom the given user is following
  const { data, error } = await supabase
    .from('followers')
    .select('followed_id, user:users!followers_followed_id_fkey(id, username, display_name, avatar_url)')
    .eq('follower_id', userId);
  if (error) throw error;
  return data;
};

// === POSTS ===
export const fetchUserPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const fetchTaggedPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('tags')
    .select('post_id, posts:post_id(*)')
    .eq('tagged_user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data?.map((t: any) => t.posts) || [];
};

export const fetchSavedPosts = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('post_id, posts:post_id(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  return data?.map((s: any) => s.posts) || [];
};

// === BLOCKS ===
export const isBlocked = async (userId: string, otherUserId: string) => {
  // Returns true if either user has blocked the other
  const { data, error } = await supabase
    .from('user_blocks')
    .select('*')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${userId})`);
  if (error) throw error;
  return data && data.length > 0;
}; 

// === SOLO GAMES SYSTEM ===
export const storeSoloGameSession = async (
  gameType: string,
  score: number,
  level: number,
  completed: boolean,
  xp: number
) => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  await supabase.from('solo_game_sessions').insert({
    user_id: user.id,
    game_type: gameType,
    score,
    level,
    completed,
    xp_earned: xp,
  });
  // Update leaderboard
  const { data: lb } = await supabase
    .from('solo_leaderboards')
    .select('high_score')
    .eq('user_id', user.id)
    .eq('game_type', gameType)
    .single();
  if (!lb || score > (lb.high_score || 0)) {
    await supabase.from('solo_leaderboards').upsert({
      user_id: user.id,
      game_type: gameType,
      high_score: score,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id,game_type' });
  }
};

export const fetchSoloGameStats = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return {};
  const { data } = await supabase.from('solo_leaderboards').select('*').eq('user_id', user.id);
  const stats: any = {};
  (data || []).forEach((row: any) => {
    stats[row.game_type] = { high_score: row.high_score, xp: 0 };
  });
  // Optionally fetch XP from sessions
  const { data: sessions } = await supabase.from('solo_game_sessions').select('game_type,xp_earned').eq('user_id', user.id);
  (sessions || []).forEach((row: any) => {
    if (!stats[row.game_type]) stats[row.game_type] = { high_score: 0, xp: 0 };
    stats[row.game_type].xp += row.xp_earned;
  });
  return stats;
};

export const fetchAchievements = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];
  const { data } = await supabase.from('user_achievements').select('*').eq('user_id', user.id);
  return data || [];
};

export const fetchDailyChallenge = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return null;
  const { data } = await supabase.from('daily_challenges').select('*').eq('user_id', user.id).order('assigned_at', { ascending: false }).limit(1);
  return (data && data[0]) || null;
};

export const fetchSpinRewards = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];
  const { data } = await supabase.from('spin_rewards').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }).limit(10);
  return data || [];
};

export const fetchSoloLeaderboard = async (gameType: string) => {
  const { data } = await supabase
    .from('solo_leaderboards')
    .select('user_id,high_score,users(username,display_name,avatar_url)')
    .eq('game_type', gameType)
    .order('high_score', { ascending: false })
    .limit(10);
  return data || [];
}; 

export const subscribeToVoiceNotes = (userId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`voice_notes:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'voice_notes',
      filter: `user_id=eq.${userId}`
    }, callback)
    .subscribe();
}; 