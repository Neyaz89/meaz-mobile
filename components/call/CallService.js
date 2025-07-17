// AGORA MOCK MODE ENABLED - To enable real calls, set ENABLE_REAL_AGORA = true
// Prompt: ENABLE_REAL_AGORA

const ENABLE_REAL_AGORA = true; // Set to true to enable real Agora SDK

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Vibration } from 'react-native';
import { supabase } from '../../lib/supabase';

const isExpoGo = Constants.appOwnership === 'expo';

let CallServiceExport;

if (isExpoGo) {
  // Dummy/no-op implementation for Expo Go
  const dummy = async () => {};
  CallServiceExport = {
    onCallStateChange: dummy,
    acceptCall: dummy,
    rejectCall: dummy,
    endCall: dummy,
    muteMic: dummy,
    toggleCamera: dummy,
    remoteUid: null,
  };
} else {
  // Only require Agora here
  const Agora = require('react-native-agora');
  const RtcEngine = Agora.default;
  const ChannelProfile = Agora.ChannelProfile;
  const ClientRole = Agora.ClientRole;

const AGORA_APP_ID = 'a947e6c3aef249f882c8a2dca2f5cb15';
let rtcEngine = null;

class CallService {
  constructor() {
    this.currentCall = null;
    this.listeners = [];
    this.isMuted = false;
    this.isCameraOn = true;
    this.callTimer = null;
    this.callStartTime = null;
    this.channelId = null;
    this.localStream = null;
    this.remoteStream = null;
    this.remoteUid = null;
    this.user = null; // Set this from auth
    this.initRealtime();
    if (ENABLE_REAL_AGORA) {
      this.initAgora();
    }
  }

  async requestPermissions(type = 'audio') {
    let audioStatus = await Audio.requestPermissionsAsync();
    if (audioStatus.status !== 'granted') throw new Error('Audio permission not granted');
    if (type === 'video') {
      let cameraStatus = await Camera.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') throw new Error('Camera permission not granted');
    }
  }

  async startCall(receiverId, type = 'audio') {
    await this.requestPermissions(type);
    const { data, error } = await supabase.rpc('start_call', {
      caller: this.user.id,
      receiver: receiverId,
      call_type: type,
    });
    if (error) throw error;
    this.channelId = data;
    this.setCallState({ status: 'calling', type, channelId: this.channelId, receiverId });
    await this.joinChannel(this.channelId, type);
  }

  async acceptCall(call) {
    await this.requestPermissions(call.type);
    await supabase.from('calls').update({ status: 'accepted', started_at: new Date().toISOString() }).eq('id', call.id);
    this.channelId = call.channel_id;
    this.setCallState({ ...call, status: 'accepted' });
    await this.joinChannel(this.channelId, call.type);
  }

  async rejectCall(call) {
    await supabase.from('calls').update({ status: 'rejected', ended_at: new Date().toISOString() }).eq('id', call.id);
    this.setCallState({ ...call, status: 'rejected' });
    await this.leaveChannel();
  }

  async endCall(call) {
    await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', call.id);
    this.setCallState({ ...call, status: 'ended' });
    await this.leaveChannel();
  }

  async muteMic(mute) {
    this.isMuted = mute;
    if (ENABLE_REAL_AGORA && rtcEngine) {
      await rtcEngine.muteLocalAudioStream(mute);
    }
    // No-op in mock mode
  }

  async toggleCamera(on) {
    this.isCameraOn = on;
    if (ENABLE_REAL_AGORA && rtcEngine) {
      await rtcEngine.muteLocalVideoStream(!on);
    }
    // No-op in mock mode
  }

  async joinChannel(channelId, type) {
    if (ENABLE_REAL_AGORA) {
      if (!rtcEngine) await this.initAgora();
      if (type === 'video') {
        await rtcEngine.enableVideo();
      } else {
        await rtcEngine.disableVideo();
      }
      // Fetch token from Supabase Edge Function
      const uid = this.user?.id || 0;
      const calleeId = this.currentCall?.receiverId || this.currentCall?.receiver_id;
      const callerName = this.user?.displayName || this.user?.username || 'Caller';
      const response = await fetch('https://orupcxnygtgofvvwhpmz.functions.supabase.co/generate-agora-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelName: channelId, uid, calleeId, callerName }),
      });
      const { token } = await response.json();
      if (!token) throw new Error('Failed to fetch Agora token');
      await rtcEngine.joinChannel(token, channelId, null, uid);
      return;
    }
    // MOCK: Simulate successful join
    this.setCallState({ ...this.currentCall, status: 'accepted', channelId });
  }

  async leaveChannel() {
    if (ENABLE_REAL_AGORA && rtcEngine) {
      await rtcEngine.leaveChannel();
      this.localStream = null;
      this.remoteStream = null;
      this.remoteUid = null;
      return;
    }
    // MOCK: No-op in mock mode
    this.localStream = null;
    this.remoteStream = null;
    this.remoteUid = null;
  }

  async initAgora() {
    if (rtcEngine) return;
    rtcEngine = await RtcEngine.create(AGORA_APP_ID);
    await rtcEngine.setChannelProfile(ChannelProfile.Communication);
    await rtcEngine.setClientRole(ClientRole.Broadcaster);
    rtcEngine.addListener('UserJoined', (uid, elapsed) => {
      this.remoteUid = uid;
      this.setCallState({ ...this.currentCall, remoteUid: uid });
    });
    rtcEngine.addListener('UserOffline', (uid, reason) => {
      this.remoteUid = null;
      this.setCallState({ ...this.currentCall, remoteUid: null });
    });
    rtcEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
      this.setCallState({ ...this.currentCall, status: 'accepted', channelId: channel });
    });
  }

  initRealtime() {
    supabase.channel('calls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, payload => {
        const call = payload.new;
        if (!call) return;
        if (call.receiver_id === this.user?.id && call.status === 'calling') {
          this.showIncomingCallNotification(call);
          this.setCallState(call);
        } else if (call.id === this.currentCall?.id) {
          this.setCallState(call);
        }
      })
      .subscribe();
  }

  async showIncomingCallNotification(call) {
    Vibration.vibrate([500, 500, 500], true);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Incoming Call',
        body: `${call.caller_name || 'Someone'} is calling you`,
        data: { type: 'call', callId: call.id },
        sound: 'default',
      },
      trigger: null,
      channelId: 'calls',
    });
  }

  setCallState(call) {
    this.currentCall = call;
    this.listeners.forEach(fn => fn(call));
  }

  onCallStateChange(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  getCallDuration() {
    if (!this.currentCall?.started_at) return 0;
    return Math.floor((Date.now() - new Date(this.currentCall.started_at).getTime()) / 1000);
  }

  async getCallHistory(userId) {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  }
  CallServiceExport = new CallService();
}

export default CallServiceExport; 