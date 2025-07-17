import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function useRealTimeProfile() {
  const { user, updateUserProfile } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time profile subscription for user:', user.id);
    
    const channel = supabase
      .channel(`user_profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time profile update received:', payload);
          const updatedUser = payload.new;
          if (updatedUser) {
            // Update the user profile in the store
            updateUserProfile({
              displayName: updatedUser.display_name,
              avatar: updatedUser.avatar_url,
              bio: updatedUser.bio,
              phone: updatedUser.phone,
              location: updatedUser.location,
              status: updatedUser.status,
              lastSeen: updatedUser.last_seen ? new Date(updatedUser.last_seen) : user.lastSeen,
              settings: updatedUser.settings,
              theme: updatedUser.theme,
              achievements: updatedUser.achievements,
              streakCount: updatedUser.streak_count,
              totalMessages: updatedUser.total_messages,
              favoriteEmojis: updatedUser.favorite_emojis,
              premiumTier: updatedUser.premium_tier as 'free' | 'premium' | 'pro',
              lastActivity: updatedUser.last_activity ? new Date(updatedUser.last_activity) : user.lastActivity,
              timezone: updatedUser.timezone,
              language: updatedUser.language,
              notificationSettings: updatedUser.notification_settings,
              privacySettings: updatedUser.privacy_settings,
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time profile subscription');
      channel.unsubscribe();
    };
  }, [user?.id, updateUserProfile]);
} 