import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import CallService from './CallService';

interface CallInterfaceProps {
  visible: boolean;
  call: any;
  onClose: () => void;
}

const ringtoneAsset = require('../../assets/sounds/ringtone.mp3'); // Add your ringtone asset

const isExpoGo = Constants.appOwnership === 'expo';

const CallServiceAny: any = CallService;
const CallInterface: React.FC<CallInterfaceProps> = ({ visible, call, onClose }) => {
  if (isExpoGo) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,10,30,0.92)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' }}>
            <Ionicons name="alert-circle" size={48} color="#faad14" style={{ marginBottom: 16 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>Calling Not Available</Text>
            <Text style={{ color: '#555', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
              Calling features are not supported in Expo Go. Please use a custom dev build or standalone app to enable voice/video calls.
            </Text>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12, backgroundColor: '#eee', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 10 }}>
              <Text style={{ color: '#007AFF', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
  const { user } = useAuthStore();
  const [status, setStatus] = useState(call?.status || 'calling');
  const [timer, setTimer] = useState(0);
  const [remoteUser, setRemoteUser] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [ringtone, setRingtone] = useState<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only require Agora here
  const { RtcLocalView, RtcRemoteView, VideoRenderMode } = require('react-native-agora');

  // Fetch remote user info
  useEffect(() => {
    const fetchUser = async () => {
      if (!user) return;
      const remoteId = call.caller_id === user.id ? call.receiver_id : call.caller_id;
      const { data } = await supabase.from('users').select('*').eq('id', remoteId).single();
      setRemoteUser(data);
    };
    if (call && user) fetchUser();
  }, [call, user]);

  // Listen for call status changes
  useEffect(() => {
    const unsub = CallServiceAny.onCallStateChange((c: any) => {
      if (c && c.id === call.id) {
        setStatus(c.status);
        if (c.status === 'accepted') startTimer();
        if (['ended', 'missed', 'rejected'].includes(c.status)) stopTimer();
      }
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [call]);

  // Play ringtone and vibrate on incoming call
  useEffect(() => {
    if (status === 'calling' && call.receiver_id === user.id) {
      playRingtone();
      Vibration.vibrate([500, 500, 500], true);
    } else {
      stopRingtone();
      Vibration.cancel();
    }
    return () => {
      stopRingtone();
      Vibration.cancel();
    };
  }, [status, call, user]);

  // Timer logic
  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // Play/stop ringtone
  const playRingtone = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(ringtoneAsset, { shouldPlay: true, isLooping: true });
      setRingtone(sound);
      await sound.playAsync();
    } catch {}
  };
  const stopRingtone = async () => {
    if (ringtone) {
      await ringtone.stopAsync();
      await ringtone.unloadAsync();
      setRingtone(null);
    }
  };

  // Accept/reject/end call
  const handleAccept = async () => {
    console.log('Accept button pressed');
    try {
    await CallServiceAny.acceptCall(call);
    } catch (e) {
      alert('Error accepting call: ' + (e?.message || e));
      console.error(e);
    }
  };
  const handleReject = async () => {
    console.log('Reject button pressed');
    try {
    await CallServiceAny.rejectCall(call);
    onClose();
    } catch (e) {
      alert('Error rejecting call: ' + (e?.message || e));
      console.error(e);
    }
  };
  const handleEnd = async () => {
    console.log('End button pressed');
    try {
    await CallServiceAny.endCall(call);
    onClose();
    } catch (e) {
      alert('Error ending call: ' + (e?.message || e));
      console.error(e);
    }
  };
  const handleMute = async () => {
    console.log('Mute button pressed');
    try {
    setIsMuted((m) => !m);
    await CallServiceAny.muteMic(!isMuted);
    } catch (e) {
      alert('Error muting mic: ' + (e?.message || e));
      console.error(e);
    }
  };
  const handleToggleCamera = async () => {
    console.log('Toggle camera button pressed');
    try {
    setIsCameraOn((c) => !c);
    await CallServiceAny.toggleCamera(!isCameraOn);
    } catch (e) {
      alert('Error toggling camera: ' + (e?.message || e));
      console.error(e);
    }
  };

  // Format timer
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // UI
  if (!call || !remoteUser || !user) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
    <View style={styles.container}>
          {/* Profile */}
          <Image source={remoteUser.avatar_url ? { uri: remoteUser.avatar_url } : require('../../assets/images/default-avatar.png')} style={styles.avatar} />
          <Text style={styles.name}>{remoteUser.display_name || remoteUser.username}</Text>
          <Text style={styles.status}>{status === 'calling' ? 'Ringing...' : status.charAt(0).toUpperCase() + status.slice(1)}</Text>
          {/* Timer */}
          {status === 'accepted' && <Text style={styles.timer}>{formatTime(timer)}</Text>}
          {/* Video preview placeholder */}
          {call.type === 'video' && status === 'accepted' ? (
            <View style={styles.videoPreview}>
              {/* Show local video */}
              <RtcLocalView.SurfaceView
                style={{ width: 100, height: 140, borderRadius: 12, backgroundColor: '#222' }}
                channelId={call.channel_id || call.channelId}
                renderMode={VideoRenderMode.Hidden}
              />
              {/* Show remote video if connected */}
              {CallServiceAny.remoteUid ? (
                <RtcRemoteView.SurfaceView
                  style={{ width: 100, height: 140, borderRadius: 12, backgroundColor: '#222', marginLeft: 8 }}
                  uid={CallServiceAny.remoteUid}
                  channelId={call.channel_id || call.channelId}
                  renderMode={VideoRenderMode.Hidden}
                />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, opacity: 0.7 }}>Waiting for remote video...</Text>
              )}
            </View>
          ) : call.type === 'video' ? (
            <View style={styles.videoPreview}>
              <Text style={{ color: '#fff', fontSize: 16, opacity: 0.7 }}>Video Preview</Text>
            </View>
          ) : null}
          {/* Controls */}
          <View style={styles.controls}>
            {status === 'calling' && call.receiver_id === user.id ? (
              <>
                <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                  <Ionicons name="call" size={36} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                  <Ionicons name="call" size={36} color="#fff" />
                </TouchableOpacity>
              </>
            ) : status === 'accepted' ? (
              <>
                <TouchableOpacity style={styles.controlBtn} onPress={handleMute}>
                  <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={32} color="#fff" />
                </TouchableOpacity>
                {call.type === 'video' && (
                  <TouchableOpacity style={styles.controlBtn} onPress={handleToggleCamera}>
                    <Ionicons name={isCameraOn ? 'videocam' : 'videocam-off'} size={32} color="#fff" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
                  <Ionicons name="call" size={36} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.endBtn} onPress={onClose}>
                <Ionicons name="close" size={36} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
    </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,10,30,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    backgroundColor: '#181a20',
    borderRadius: 24,
    alignItems: 'center',
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 18,
    backgroundColor: '#eee',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  status: {
    fontSize: 16,
    color: '#25d366',
    marginBottom: 8,
  },
  timer: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 12,
  },
  videoPreview: {
    width: 220,
    height: 140,
    backgroundColor: '#222',
    borderRadius: 18,
    marginVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    backgroundColor: '#25d366',
    borderRadius: 32,
    padding: 18,
    marginHorizontal: 18,
  },
  rejectBtn: {
    backgroundColor: '#FF4444',
    borderRadius: 32,
    padding: 18,
    marginHorizontal: 18,
  },
  endBtn: {
    backgroundColor: '#FF4444',
    borderRadius: 32,
    padding: 18,
    marginHorizontal: 18,
  },
  controlBtn: {
    backgroundColor: '#333',
    borderRadius: 28,
    padding: 14,
    marginHorizontal: 12,
  },
});

export default CallInterface; 