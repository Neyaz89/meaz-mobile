import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotificationStore } from '../../store/notificationStore';

const NotificationHooks = () => {
  const { subscribeToNotifications } = useNotificationStore();

  useEffect(() => {
    subscribeToNotifications();

    const channel = supabase.channel('custom-all-stories')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stories' },
        payload => {
          // TODO: Show notification/toast for new stories
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
};

export default NotificationHooks; 