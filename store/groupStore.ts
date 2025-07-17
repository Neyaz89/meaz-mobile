import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ToastAndroid, Platform } from 'react-native';

function showToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // TODO: Implement iOS toast or use a cross-platform library
    console.log('Toast:', message);
  }
}

interface GroupMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

interface GroupStore {
  members: GroupMember[];
  loading: boolean;
  error: string | null;
  fetchMembers: (chatId: string) => Promise<void>;
  addMember: (chatId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  removeMember: (chatId: string, userId: string) => Promise<void>;
  updateMemberRole: (chatId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
  // Optionally: subscribeToMembershipChanges: (chatId: string) => any;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  fetchMembers: async (chatId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('chat_members')
      .select('*')
      .eq('chat_id', chatId);
    set({ members: data || [], loading: false, error: error ? error.message : null });
    if (error) showToast(error.message);
  },

  addMember: async (chatId, userId, role) => {
    set({ loading: true, error: null });
    const { error } = await supabase
      .from('chat_members')
      .insert([{ chat_id: chatId, user_id: userId, role }]);
    if (error) {
      set({ error: error.message });
      showToast(error.message);
    } else {
      showToast('Member added!');
    }
    await get().fetchMembers(chatId);
    set({ loading: false });
  },

  removeMember: async (chatId, userId) => {
    set({ loading: true, error: null });
    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    if (error) {
      set({ error: error.message });
      showToast(error.message);
    } else {
      showToast('Member removed!');
    }
    await get().fetchMembers(chatId);
    set({ loading: false });
  },

  updateMemberRole: async (chatId, userId, role) => {
    set({ loading: true, error: null });
    const { error } = await supabase
      .from('chat_members')
      .update({ role })
      .eq('chat_id', chatId)
      .eq('user_id', userId);
    if (error) {
      set({ error: error.message });
      showToast(error.message);
    } else {
      showToast('Role updated!');
    }
    await get().fetchMembers(chatId);
    set({ loading: false });
  },
  // Optionally: subscribeToMembershipChanges: (chatId: string) => { ... }
})); 