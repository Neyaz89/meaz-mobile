import { useCallback, useEffect, useState } from 'react';
import { Platform, ToastAndroid } from 'react-native';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

export function useSupabaseAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileSubscription, setProfileSubscription] = useState<any>(null);

  // Fetch current user on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        fetchProfile(data.session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
      // Cleanup profile subscription
      if (profileSubscription) {
        profileSubscription.unsubscribe();
      }
    };
  }, []);

  // Set up real-time subscription for profile changes
  useEffect(() => {
    if (user?.id) {
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
              setUser(prevUser => prevUser ? {
                ...prevUser,
                display_name: updatedUser.display_name || prevUser.display_name,
                avatar_url: updatedUser.avatar_url || prevUser.avatar_url,
                bio: updatedUser.bio || prevUser.bio,
                phone: updatedUser.phone || prevUser.phone,
                location: updatedUser.location || prevUser.location,
                status: updatedUser.status || prevUser.status,
                last_seen: updatedUser.last_seen || prevUser.last_seen,
                settings: updatedUser.settings || prevUser.settings,
                theme: updatedUser.theme || prevUser.theme,
                achievements: updatedUser.achievements || prevUser.achievements,
                streak_count: updatedUser.streak_count || prevUser.streak_count,
                total_messages: updatedUser.total_messages || prevUser.total_messages,
                favorite_emojis: updatedUser.favorite_emojis || prevUser.favorite_emojis,
                premium_tier: updatedUser.premium_tier || prevUser.premium_tier,
                last_activity: updatedUser.last_activity || prevUser.last_activity,
                timezone: updatedUser.timezone || prevUser.timezone,
                language: updatedUser.language || prevUser.language,
                notification_settings: updatedUser.notification_settings || prevUser.notification_settings,
                privacy_settings: updatedUser.privacy_settings || prevUser.privacy_settings,
              } : null);
            }
          }
        )
        .subscribe();

      setProfileSubscription(channel);
    }
  }, [user?.id]);

  // Fetch user profile from 'users' table
  const fetchProfile = useCallback(async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
      return null;
    }
    setUser(data);
    return data;
  }, []);

  // Update user profile in 'users' table
  const updateProfile = useCallback(async (profile: Partial<UserProfile>) => {
    if (!user) return null;
    setLoading(true);
    const { data, error } = await supabase.from('users').update(profile).eq('id', user.id).select().single();
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
      return null;
    }
    setUser(data);
    showToast('Profile updated!');
    return data;
  }, [user]);

  // Auth flows
  const signUp = useCallback(async (email: string, password: string, extra?: Record<string, any>) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: extra }
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
    }
    return { data, error };
  }, []);

  const signIn = useCallback(async (emailOrPhone: string, password?: string) => {
    setLoading(true);
    setError(null);
    let result;
    if (emailOrPhone.includes('@')) {
      result = await supabase.auth.signInWithPassword({ email: emailOrPhone, password });
    } else {
      result = await supabase.auth.signInWithPassword({ phone: emailOrPhone, password });
    }
    const { data, error } = result;
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
    }
    return { data, error };
  }, []);

  const signInPasswordless = useCallback(async (emailOrPhone: string) => {
    setLoading(true);
    setError(null);
    let result;
    if (emailOrPhone.includes('@')) {
      result = await supabase.auth.signInWithOtp({ email: emailOrPhone });
    } else {
      result = await supabase.auth.signInWithOtp({ phone: emailOrPhone });
    }
    const { error } = result;
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
    } else {
      showToast('OTP sent! Check your email or SMS.');
    }
    return result;
  }, []);

  const verifyOTP = useCallback(async (emailOrPhone: string, otp: string) => {
    setLoading(true);
    setError(null);
    let result;
    if (emailOrPhone.includes('@')) {
      result = await supabase.auth.verifyOtp({ email: emailOrPhone, token: otp, type: 'email' });
    } else {
      result = await supabase.auth.verifyOtp({ phone: emailOrPhone, token: otp, type: 'sms' });
    }
    const { data, error } = result;
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
    } else if (data.user) {
      fetchProfile(data.user.id);
      showToast('Logged in!');
    }
    return { data, error };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      setError(error.message);
      showToast(error.message);
    } else {
      setUser(null);
    }
    return { error };
  }, []);

  return {
    user,
    loading,
    error,
    signUp,
    signIn,
    signInPasswordless,
    verifyOTP,
    signOut,
    fetchProfile,
    updateProfile,
  };
} 