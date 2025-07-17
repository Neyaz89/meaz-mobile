import { Platform, ToastAndroid } from 'react-native';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface NotificationStore {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  fetchNotifications: (userId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => any;
  markAsRead: (notificationId: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
}

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  loading: false,
  error: null,

  fetchNotifications: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      set({ notifications: data || [], loading: false, error: error ? error.message : null });
      if (error) showToast(error.message);
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Failed to fetch notifications' });
    }
  },

  subscribeToNotifications: (userId) => {
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        get().fetchNotifications(userId);
      })
      .subscribe();
    return subscription;
  },

  markAsRead: async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    if (error) {
      showToast(error.message);
    } else {
      // Optimistically update state
      set({ notifications: get().notifications.map(n => n.id === notificationId ? { ...n, read: true } : n) });
      showToast('Notification marked as read');
    }
  },

  addNotification: async (notification) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();
    if (error) {
      showToast(error.message);
    } else if (data && data.length > 0) {
      set({ notifications: [data[0], ...get().notifications] });
      showToast('Notification sent');
    }
  },
})); 