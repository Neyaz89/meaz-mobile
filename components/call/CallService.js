// AGORA REAL MODE ENABLED - Production ready calling service
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import { Platform, Vibration } from 'react-native';
import { supabase } from '../../lib/supabase';

const isExpoGo = Constants.appOwnership === 'expo';

let CallServiceExport;

if (isExpoGo) {
  // Dummy implementation for Expo Go
  const dummy = async () => {};
  CallServiceExport = {
    onCallStateChange: dummy,
    acceptCall: dummy,
    rejectCall: dummy,
    endCall: dummy,
    muteMic: dummy,
    toggleCamera: dummy,
    remoteUid: null,
    startCall: dummy,
    joinChannel: dummy,
    leaveChannel: dummy,
    initAgora: dummy,
    requestPermissions: dummy,
  };
} else {
  // Real Agora implementation
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
      this.user = null;
      this.isInitialized = false;
      this.initRealtime();
    }

    async requestPermissions(type = 'audio') {
      try {
        const audioStatus = await Audio.requestPermissionsAsync();
        if (audioStatus.status !== 'granted') {
          throw new Error('Audio permission not granted');
        }
        
        if (type === 'video') {
          const cameraStatus = await Camera.requestCameraPermissionsAsync();
          if (cameraStatus.status !== 'granted') {
            throw new Error('Camera permission not granted');
          }
        }
        
        return true;
      } catch (error) {
        console.error('Permission request failed:', error);
        throw error;
      }
    }

    async initAgora() {
      if (rtcEngine || this.isInitialized) return;
      
      try {
        rtcEngine = await RtcEngine.create(AGORA_APP_ID);
        await rtcEngine.setChannelProfile(ChannelProfile.Communication);
        await rtcEngine.setClientRole(ClientRole.Broadcaster);
        
        // Enable audio by default
        await rtcEngine.enableAudio();
        
        // Set up event listeners
        rtcEngine.addListener('UserJoined', (uid, elapsed) => {
          console.log('User joined:', uid);
          this.remoteUid = uid;
          this.setCallState({ ...this.currentCall, remoteUid: uid });
        });
        
        rtcEngine.addListener('UserOffline', (uid, reason) => {
          console.log('User offline:', uid, reason);
          if (uid === this.remoteUid) {
            this.remoteUid = null;
            this.setCallState({ ...this.currentCall, remoteUid: null });
          }
        });
        
        rtcEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
          console.log('Join channel success:', channel, uid);
          this.setCallState({ ...this.currentCall, status: 'accepted', channelId: channel });
        });
        
        rtcEngine.addListener('Error', (error) => {
          console.error('Agora error:', error);
        });
        
        this.isInitialized = true;
        console.log('Agora initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Agora:', error);
        throw error;
      }
    }

    async startCall(receiverId, type = 'audio') {
      try {
        await this.requestPermissions(type);
        await this.initAgora();
        
        const { data, error } = await supabase.rpc('start_call', {
          caller: this.user.id,
          receiver: receiverId,
          call_type: type,
        });
        
        if (error) throw error;
        
        this.channelId = data;
        this.setCallState({ 
          status: 'calling', 
          type, 
          channelId: this.channelId, 
          receiverId,
          callerId: this.user.id 
        });
        
        await this.joinChannel(this.channelId, type);
        return data;
      } catch (error) {
        console.error('Failed to start call:', error);
        throw error;
      }
    }

    async acceptCall(call) {
      try {
        await this.requestPermissions(call.type);
        await this.initAgora();
        
        await supabase.from('calls').update({ 
          status: 'accepted', 
          started_at: new Date().toISOString() 
        }).eq('id', call.id);
        
        this.channelId = call.channel_id;
        this.setCallState({ ...call, status: 'accepted' });
        
        await this.joinChannel(this.channelId, call.type);
      } catch (error) {
        console.error('Failed to accept call:', error);
        throw error;
      }
    }

    async rejectCall(call) {
      try {
        await supabase.from('calls').update({ 
          status: 'rejected', 
          ended_at: new Date().toISOString() 
        }).eq('id', call.id);
        
        this.setCallState({ ...call, status: 'rejected' });
        await this.leaveChannel();
      } catch (error) {
        console.error('Failed to reject call:', error);
        throw error;
      }
    }

    async endCall(call) {
      try {
        await supabase.from('calls').update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        }).eq('id', call.id);
        
        this.setCallState({ ...call, status: 'ended' });
        await this.leaveChannel();
      } catch (error) {
        console.error('Failed to end call:', error);
        throw error;
      }
    }

    async muteMic(mute) {
      try {
        this.isMuted = mute;
        if (rtcEngine) {
          await rtcEngine.muteLocalAudioStream(mute);
        }
      } catch (error) {
        console.error('Failed to mute mic:', error);
        throw error;
      }
    }

    async toggleCamera(on) {
      try {
        this.isCameraOn = on;
        if (rtcEngine) {
          await rtcEngine.muteLocalVideoStream(!on);
        }
      } catch (error) {
        console.error('Failed to toggle camera:', error);
        throw error;
      }
    }

    async joinChannel(channelId, type) {
      try {
        if (!rtcEngine) await this.initAgora();
        
        if (type === 'video') {
          await rtcEngine.enableVideo();
        } else {
          await rtcEngine.disableVideo();
        }
        
        // Generate token from Supabase Edge Function
        const uid = Math.floor(Math.random() * 1000000);
        const calleeId = this.currentCall?.receiverId || this.currentCall?.receiver_id;
        const callerName = this.user?.displayName || this.user?.username || 'Caller';
        
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/generate-agora-token`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify({ 
            channelName: channelId, 
            uid, 
            calleeId, 
            callerName 
          }),
        });
        
        const { token } = await response.json();
        if (!token) throw new Error('Failed to fetch Agora token');
        
        await rtcEngine.joinChannel(token, channelId, null, uid);
        console.log('Joined channel successfully:', channelId);
      } catch (error) {
        console.error('Failed to join channel:', error);
        throw error;
      }
    }

    async leaveChannel() {
      try {
        if (rtcEngine) {
          await rtcEngine.leaveChannel();
          this.localStream = null;
          this.remoteStream = null;
          this.remoteUid = null;
        }
      } catch (error) {
        console.error('Failed to leave channel:', error);
      }
    }

    initRealtime() {
      supabase.channel('calls')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'calls' 
        }, payload => {
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
      try {
        Vibration.vibrate([500, 500, 500], true);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Incoming Call',
            body: `${call.caller_name || 'Someone'} is calling you`,
            data: { type: 'call', callId: call.id },
            sound: 'default',
          },
          trigger: null,
        });
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
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