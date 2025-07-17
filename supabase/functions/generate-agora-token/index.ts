import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { RtcRole, RtcTokenBuilder } from "https://esm.sh/agora-token@2.0.5"

const AGORA_APP_ID = Deno.env.get('AGORA_APP_ID')
const AGORA_APP_CERTIFICATE = Deno.env.get('AGORA_APP_CERTIFICATE')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const { channelName, uid, role = 'publisher', expire = 3600, calleeId, callerName } = await req.json()
    if (!channelName || !uid || !calleeId) {
      return new Response(JSON.stringify({ error: 'Missing channelName, uid, or calleeId' }), { status: 400 })
    }
    const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      Number(uid),
      agoraRole,
      Math.floor(Date.now() / 1000) + expire
    )

    // Send push notification to callee
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: callee, error } = await supabase
      .from('users')
      .select('expo_push_token')
      .eq('id', calleeId)
      .single()
    if (!callee?.expo_push_token) {
      return new Response(JSON.stringify({ token, warning: 'No expo_push_token for callee' }), { status: 200 })
    }
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        to: callee.expo_push_token,
        sound: 'default',
        title: 'Incoming Call',
        body: `${callerName || 'Someone'} is calling you`,
        data: { type: 'call', callId: channelName, callerName },
        channelId: 'calls'
      }])
    })
    const expoJson = await expoRes.json()
    return new Response(JSON.stringify({ token, push: expoJson }), { status: 200 })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}) 