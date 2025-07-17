import { create } from 'zustand';
import { Database, subscribeToSnaps, supabase, uploadFile } from '../lib/supabase';

type Snap = Database['public']['Tables']['snaps']['Row'];
type User = Database['public']['Tables']['users']['Row'];

interface SnapsState {
  receivedSnaps: Snap[];
  sentSnaps: Snap[];
  loading: boolean;
  
  // Actions
  fetchReceivedSnaps: () => Promise<void>;
  fetchSentSnaps: () => Promise<void>;
  sendSnap: (receiverId: string, mediaFile: any, caption?: string) => Promise<{ error: any }>;
  viewSnap: (snapId: string) => Promise<void>;
  deleteSnap: (snapId: string) => Promise<{ error: any }>;
  cleanExpiredSnaps: () => void;
  subscribeToSnaps: () => void;
  unsubscribeFromSnaps: () => void;
}

export const useSnapsStore = create<SnapsState>((set, get) => ({
  receivedSnaps: [],
  sentSnaps: [],
  loading: false,

  fetchReceivedSnaps: async () => {
    set({ loading: true });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: snaps, error } = await supabase
        .from('snaps')
        .select(`
          *,
          sender:users!snaps_sender_id_fkey(*)
        `)
        .eq('receiver_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received snaps:', error);
        return;
      }

      set({ receivedSnaps: snaps || [], loading: false });
    } catch (error) {
      console.error('Error fetching received snaps:', error);
      set({ loading: false });
    }
  },

  fetchSentSnaps: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: snaps, error } = await supabase
        .from('snaps')
        .select(`
          *,
          receiver:users!snaps_receiver_id_fkey(*)
        `)
        .eq('sender_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent snaps:', error);
        return;
      }

      set({ sentSnaps: snaps || [] });
    } catch (error) {
      console.error('Error fetching sent snaps:', error);
    }
  },

  sendSnap: async (receiverId: string, mediaFile: any, caption?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: { message: 'No user logged in' } };

      // Upload media file
      const fileExt = mediaFile.name?.split('.').pop() || 'jpg';
      const fileName = `snaps/${user.id}-${Date.now()}.${fileExt}`;
      
      const mediaUrl = await uploadFile(mediaFile, fileName);
      if (!mediaUrl) {
        return { error: { message: 'Failed to upload media' } };
      }

      // Create snap record
      const expiresAt = new Date(Date.now() + 10 * 1000).toISOString(); // 10 seconds

      const { data: snap, error } = await supabase
        .from('snaps')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          media_url: mediaUrl,
          caption: caption || '',
          expires_at: expiresAt,
          viewed: false
        })
        .select()
        .single();

      if (error) {
        return { error };
      }

      // Add to local state
      set(state => ({
        sentSnaps: [snap, ...state.sentSnaps]
      }));

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  viewSnap: async (snapId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark snap as viewed
      await supabase
        .from('snaps')
        .update({ viewed: true })
        .eq('id', snapId);

      // Update local state
      set(state => ({
        receivedSnaps: state.receivedSnaps.map(snap => 
          snap.id === snapId ? { ...snap, viewed: true } : snap
        )
      }));

      // Auto-delete after viewing (10 seconds)
      setTimeout(() => {
        get().deleteSnap(snapId);
      }, 10000);
    } catch (error) {
      console.error('Error viewing snap:', error);
    }
  },

  deleteSnap: async (snapId: string) => {
    try {
      const { error } = await supabase
        .from('snaps')
        .delete()
        .eq('id', snapId);

      if (error) {
        return { error };
      }

      // Remove from local state
      set(state => ({
        receivedSnaps: state.receivedSnaps.filter(snap => snap.id !== snapId),
        sentSnaps: state.sentSnaps.filter(snap => snap.id !== snapId)
      }));

      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  cleanExpiredSnaps: () => {
    const now = new Date();
    
    set(state => ({
      receivedSnaps: state.receivedSnaps.filter(snap => 
        new Date(snap.expires_at) > now
      ),
      sentSnaps: state.sentSnaps.filter(snap => 
        new Date(snap.expires_at) > now
      )
    }));
  },

  subscribeToSnaps: () => {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return;

    const subscription = subscribeToSnaps(user.id, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newSnap = payload.new as Snap;
        set(state => ({
          receivedSnaps: [newSnap, ...state.receivedSnaps]
        }));
      } else if (payload.eventType === 'UPDATE') {
        const updatedSnap = payload.new as Snap;
        set(state => ({
          receivedSnaps: state.receivedSnaps.map(snap => 
            snap.id === updatedSnap.id ? updatedSnap : snap
          )
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedSnap = payload.old as Snap;
        set(state => ({
          receivedSnaps: state.receivedSnaps.filter(snap => snap.id !== deletedSnap.id),
          sentSnaps: state.sentSnaps.filter(snap => snap.id !== deletedSnap.id)
        }));
      }
    });

    return subscription;
  },

  unsubscribeFromSnaps: () => {
    // Supabase will handle cleanup automatically
  },
}));

// Clean up expired snaps every second
setInterval(() => {
  useSnapsStore.getState().cleanExpiredSnaps();
}, 1000); 