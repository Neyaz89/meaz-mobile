import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useNotificationStore } from '../../store/notificationStore';
import { useSupabaseAuth } from '../../hooks/useSupabaseAuth';
// TODO: Add toast, badge, in-app notification logic
export const NotificationCenter: React.FC = () => {
  const { user } = useSupabaseAuth();
  const userId = user?.id;
  const { notifications, loading, error, fetchNotifications, subscribeToNotifications, markAsRead } = useNotificationStore();
  const [toast, setToast] = useState<string | null>(null);
  const [toastAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!userId) return;
    fetchNotifications(userId);
    const sub = subscribeToNotifications(userId);
    return () => { if (sub && sub.unsubscribe) sub.unsubscribe(); };
  }, [userId]);

  // Toast for new notifications
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (!latest.read) {
      setToast(latest.message);
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast(null));
        }, 2000);
      });
    }
  }, [notifications.length]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <ActivityIndicator style={{ margin: 32 }} />;
  if (error) return <Text style={{ color: 'red', margin: 16 }}>{error}</Text>;

  return (
    <View style={styles.container}>
      {/* Toast */}
      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] }] }>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
        )}
      </View>
      {notifications.length === 0 && <Text style={{ color: '#888' }}>No notifications</Text>}
      {notifications.map((n) => (
        <TouchableOpacity key={n.id} style={[styles.notificationRow, n.read && { opacity: 0.5 }]} onPress={() => markAsRead(n.id)}>
          <Text style={styles.message}>{n.message}</Text>
        </TouchableOpacity>
      ))}
      {/* TODO: Add toast, badge, in-app notification logic */}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontWeight: 'bold', fontSize: 18, marginRight: 8 },
  badge: { backgroundColor: '#f00', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 4 },
  badgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  notificationRow: { marginBottom: 6 },
  message: { color: '#333' },
  toast: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#222', padding: 12, zIndex: 100, alignItems: 'center', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  toastText: { color: '#fff', fontWeight: 'bold' },
}); 