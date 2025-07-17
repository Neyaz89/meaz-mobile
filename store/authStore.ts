import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, ToastAndroid } from 'react-native';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, UserTheme } from '../types';
// TODO: Add a custom Toast component for iOS if needed

const defaultTheme: UserTheme = {
  id: 'quantum',
  name: 'Quantum',
  primary: '#06b6d4',
  secondary: '#8b5cf6',
  accent: '#f59e0b',
  background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
  bubbleStyle: 'glassmorphism',
  chatBackground: 'https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg?auto=compress&cs=tinysrgb&w=1920',
  fontFamily: 'Inter',
  fontSize: 'medium',
  animations: true,
  soundEffects: true
};

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

// Database user type (matches Supabase schema)
interface DatabaseUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  bio?: string;
  phone?: string;
  location?: string;
  last_seen: string;
  settings: any;
  theme: any;
  achievements: any[];
  created_at: string;
  updated_at: string;
  streak_count?: number;
  total_messages?: number;
  favorite_emojis?: string[];
  premium_tier?: string;
  last_activity?: string;
  timezone?: string;
  language?: string;
  notification_settings?: any;
  privacy_settings?: any;
}

// Convert database user to app user
const mapDatabaseUserToUser = (dbUser: DatabaseUser): User => ({
  id: dbUser.id,
  email: dbUser.email,
  username: dbUser.username,
  displayName: dbUser.display_name,
  avatar: dbUser.avatar_url || '', // Ensure empty string instead of null/undefined
  status: dbUser.status,
  lastSeen: new Date(dbUser.last_seen),
  bio: dbUser.bio || '',
  phone: dbUser.phone || '',
  location: dbUser.location || '',
  joinedAt: new Date(dbUser.created_at),
  settings: dbUser.settings || {},
  theme: dbUser.theme || {},
  friends: [],
  blockedUsers: [],
  mutedChats: [],
  pinnedChats: [],
  customStickers: [],
  achievements: dbUser.achievements || [],
  streakCount: dbUser.streak_count || 0,
  totalMessages: dbUser.total_messages || 0,
  favoriteEmojis: dbUser.favorite_emojis || ['😊', '👍', '❤️', '😂', '🔥'],
  premiumTier: (dbUser.premium_tier as 'free' | 'premium' | 'pro') || 'free',
  lastActivity: dbUser.last_activity ? new Date(dbUser.last_activity) : new Date(dbUser.created_at),
  timezone: dbUser.timezone || undefined,
  language: dbUser.language || 'en',
  notificationSettings: dbUser.notification_settings || {},
  privacySettings: dbUser.privacy_settings || {}
});

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  hasCompletedOnboarding: boolean;
  isAuthenticated: boolean;
  profileSubscription?: any; // Add this for real-time subscription cleanup
  onboardingStep: number;

  signUp: (email: string, password: string, displayName: string, username: string) => Promise<{ error?: { message: string } }>;
  signIn: (email: string, password: string) => Promise<{ error?: { message: string } }>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<{ error?: { message: string } }>;
  updateUserProfile: (profile: Partial<User>) => void; // Add this method for real-time updates
  uploadAvatar: (file: any) => Promise<{ error?: { message: string } }>;
  refreshUser: () => Promise<void>;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  initializeAuth: () => Promise<void>;
  initialize: () => Promise<void>;
  cleanup: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true
  error: null,
  onboardingStep: 0,
  hasCompletedOnboarding: true, // Set to true by default to skip onboarding
  isInitialized: false, // Track if auth has been initialized
  profileSubscription: null, // Initialize profileSubscription

  // Initialize auth store with real-time subscriptions
  initialize: async () => {
    const { user } = get();
    if (user) {
      // Set up real-time subscription for user profile changes
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
            console.log('Real-time profile update:', payload);
            const updatedUser = payload.new;
            if (updatedUser) {
              // Update local user state with new profile data
              set(state => ({
                user: state.user ? {
                  ...state.user,
                  displayName: updatedUser.display_name || state.user.displayName,
                  avatar: updatedUser.avatar_url || state.user.avatar,
                  bio: updatedUser.bio || state.user.bio,
                  phone: updatedUser.phone || state.user.phone,
                  location: updatedUser.location || state.user.location,
                  status: updatedUser.status || state.user.status,
                  lastSeen: updatedUser.last_seen ? new Date(updatedUser.last_seen) : state.user.lastSeen,
                  settings: updatedUser.settings || state.user.settings,
                  theme: updatedUser.theme || state.user.theme,
                  achievements: updatedUser.achievements || state.user.achievements,
                  streakCount: updatedUser.streak_count || state.user.streakCount,
                  totalMessages: updatedUser.total_messages || state.user.totalMessages,
                  favoriteEmojis: updatedUser.favorite_emojis || state.user.favoriteEmojis,
                  premiumTier: updatedUser.premium_tier || state.user.premiumTier,
                  lastActivity: updatedUser.last_activity ? new Date(updatedUser.last_activity) : state.user.lastActivity,
                  timezone: updatedUser.timezone || state.user.timezone,
                  language: updatedUser.language || state.user.language,
                  notificationSettings: updatedUser.notification_settings || state.user.notificationSettings,
                  privacySettings: updatedUser.privacy_settings || state.user.privacySettings,
                } : null
              }));
            }
          }
        )
        .subscribe();

      // Store channel reference for cleanup
      set({ profileSubscription: channel });
    }
  },

  // Cleanup real-time subscriptions
  cleanup: () => {
    const { profileSubscription } = get();
    if (profileSubscription) {
      profileSubscription.unsubscribe();
      set({ profileSubscription: null });
    }
  },

  signUp: async (email, password, displayName, username) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Starting signUp process...', { displayName, email, username });
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            display_name: displayName,
            username: username,
          } 
        } 
      });
      
      console.log('Supabase auth signUp result:', { data, error });
      
      if (error) {
        console.error('Supabase auth error:', error);
        set({ isLoading: false, error: error.message });
        return { error: { message: error.message } };
      }
      
      if (data.user) {
        console.log('User created in auth, checking if profile exists...', data.user.id);
        
        // Check if profile already exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        console.log('Profile check result:', { existingProfile, fetchError });
        
        if (fetchError && fetchError.code === '42P01') {
          console.log('Users table does not exist - database setup required');
          set({ isLoading: false, error: 'Database not set up. Please run the setup script first.' });
          return { error: { message: 'Database not set up. Please run the setup script first.' } };
        }

        if (!existingProfile) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email || '',
              username: username,
              display_name: displayName,
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            set({ isLoading: false, error: profileError.message });
            return { error: { message: profileError.message } };
          }
        }

        // Fetch the complete user profile
        const { data: userProfile, error: profileFetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileFetchError) {
          console.error('Profile fetch error:', profileFetchError);
          set({ isLoading: false, error: profileFetchError.message });
          return { error: { message: profileFetchError.message } };
        }

        if (userProfile) {
          const user = mapDatabaseUserToUser(userProfile);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            hasCompletedOnboarding: true
          });
          
          // Store session data
          await AsyncStorage.setItem('@auth_session', JSON.stringify({
            user: user,
            timestamp: Date.now()
          }));
        }
      }

      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      set({ isLoading: false, error: errorMessage });
      return { error: { message: errorMessage } };
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      console.log('Starting signIn process...', { email });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase auth signIn result:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        set({ isLoading: false, error: error.message });
        return { error: { message: error.message } };
      }

      if (data.user) {
        console.log('User authenticated, fetching profile...', data.user.id);
        
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        console.log('Profile fetch result:', { profile, profileError });
        
        if (profileError) {
          console.error('Profile fetch error:', profileError);
          set({ isLoading: false, error: profileError.message });
          return { error: { message: profileError.message } };
        }
        
        if (profile) {
          const user = mapDatabaseUserToUser(profile);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            hasCompletedOnboarding: true
          });
          
          // Store session data
          await AsyncStorage.setItem('@auth_session', JSON.stringify({
            user: user,
            timestamp: Date.now()
          }));
        }
      }
      
      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      set({ isLoading: false, error: errorMessage });
      return { error: { message: errorMessage } };
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      
      // Clear stored session
      await AsyncStorage.removeItem('@auth_session');
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      set({ isLoading: false, error: errorMessage });
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = get();
      if (!user) return { error: { message: 'No user logged in' } };

      const dbUpdates: any = {};
      
      if (updates.displayName) dbUpdates.display_name = updates.displayName;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.settings) dbUpdates.settings = updates.settings;
      if (updates.theme) dbUpdates.theme = updates.theme;

      const { error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) {
        set({ isLoading: false, error: error.message });
        return { error: { message: error.message } };
      }

      // Update local user state
      const updatedUser = { ...user, ...updates };
      set(state => ({
        user: updatedUser,
        isLoading: false,
        error: null
      }));
      
      // Update stored session
      await AsyncStorage.setItem('@auth_session', JSON.stringify({
        user: updatedUser,
        timestamp: Date.now()
      }));

      return {};
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      set({ isLoading: false, error: errorMessage });
      return { error: { message: errorMessage } };
    }
  },

  updateUserProfile: (profile: Partial<User>) => {
    set(state => ({
      user: state.user ? { ...state.user, ...profile } : null
    }));
  },

  uploadAvatar: async (file) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = get();
      if (!user) return { error: { message: 'No user logged in' } };
      
      const fileExt = file.name?.split('.').pop() || 'jpg';
      const fileName = `avatars/${user.id}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('meaz-storage')
        .upload(fileName, file, { upsert: true });
      
      if (error) {
        set({ isLoading: false, error: error.message });
        return { error: { message: error.message } };
      }
      
      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('meaz-storage')
        .getPublicUrl(fileName);
      
      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
          .from('users')
        .update({ avatar_url: urlData.publicUrl })
          .eq('id', user.id);
      
      if (updateError) {
        set({ isLoading: false, error: updateError.message });
        return { error: { message: updateError.message } };
      }
      
      // Update local user state
      const updatedUser = { ...user, avatar: urlData.publicUrl };
      set(state => ({
        user: updatedUser,
        isLoading: false,
        error: null
      }));
      
      // Update stored session
      await AsyncStorage.setItem('@auth_session', JSON.stringify({
        user: updatedUser,
        timestamp: Date.now()
      }));
      
      return {};
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload avatar';
      set({ isLoading: false, error: errorMessage });
      return { error: { message: errorMessage } };
    }
  },

  refreshUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          const mappedUser = mapDatabaseUserToUser(profile);
          set({
            user: mappedUser,
            isAuthenticated: true,
            error: null
          });
          
          // Update stored session
          await AsyncStorage.setItem('@auth_session', JSON.stringify({
            user: mappedUser,
            timestamp: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  },

  setOnboardingStep: (step) => {
    set({ onboardingStep: step });
  },

  completeOnboarding: () => {
    set({ hasCompletedOnboarding: true, onboardingStep: 0 });
  },

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      console.log('Initializing authentication...');
      
      // First, try to restore from AsyncStorage for faster initial load
      const storedSession = await AsyncStorage.getItem('@auth_session');
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession);
          const sessionAge = Date.now() - parsedSession.timestamp;
          
          // Only use stored session if it's less than 24 hours old
          if (sessionAge < 24 * 60 * 60 * 1000 && parsedSession.user) {
            console.log('Restoring user from stored session:', parsedSession.user.id);
            set({
              user: parsedSession.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              hasCompletedOnboarding: true,
              isInitialized: true
            });
            
            // Verify session is still valid with Supabase
            const { data: { session }, error } = await supabase.auth.getSession();
            if (!session || error) {
              console.log('Stored session is invalid, clearing...');
              await AsyncStorage.removeItem('@auth_session');
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                isInitialized: true
              });
            }
            return;
          }
        } catch (parseError) {
          console.log('Error parsing stored session:', parseError);
          await AsyncStorage.removeItem('@auth_session');
        }
      }
      
      // Get the current session from Supabase
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        set({ isLoading: false, error: error.message, isInitialized: true });
        return;
      }
  
      if (session?.user) {
        console.log('User session found, fetching profile...', session.user.id);
        
        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          set({ isLoading: false, error: profileError.message, isInitialized: true });
          return;
        }

        if (profile) {
          const user = mapDatabaseUserToUser(profile);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            hasCompletedOnboarding: true,
            isInitialized: true
          });
          
          // Store session data
          await AsyncStorage.setItem('@auth_session', JSON.stringify({
            user: user,
            timestamp: Date.now()
          }));
        } else {
          set({ isLoading: false, error: 'User profile not found', isInitialized: true });
        }
      } else {
        console.log('No active session found');
        set({ isLoading: false, isInitialized: true });
      }
      
      // Set up auth state change listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profile) {
            const user = mapDatabaseUserToUser(profile);
            set({
              user,
              isAuthenticated: true,
              error: null
            });
            
            await AsyncStorage.setItem('@auth_session', JSON.stringify({
              user: user,
              timestamp: Date.now()
            }));
          }
        } else if (event === 'SIGNED_OUT') {
          set({
            user: null,
            isAuthenticated: false,
            error: null
          });
          
          await AsyncStorage.removeItem('@auth_session');
        }
      });
      
  } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize auth';
      console.error('Auth initialization error:', errorMessage);
      set({ isLoading: false, error: errorMessage, isInitialized: true });
    }
  },
}));

// Export initializeAuth function for use in App.tsx
export const initializeAuth = () => useAuthStore.getState().initializeAuth(); 