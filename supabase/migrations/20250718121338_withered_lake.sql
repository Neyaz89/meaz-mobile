/*
  # Enhanced Meaz App Database Schema
  
  This migration creates a comprehensive database schema for the Meaz social communication app
  with all necessary tables, functions, triggers, and security policies.
  
  ## Features Covered:
  1. User management and profiles
  2. Real-time chat and messaging
  3. Stories and posts
  4. Voice calls and video calls
  5. Voice notes and media uploads
  6. Friend system and social features
  7. Games and achievements
  8. Notifications and real-time updates
  
  ## Security:
  - Row Level Security (RLS) enabled on all tables
  - Proper policies for data access control
  - Secure user profile creation
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with enhanced profile features
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  bio TEXT DEFAULT '',
  phone TEXT,
  location TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}',
  theme JSONB DEFAULT '{}',
  achievements JSONB DEFAULT '[]',
  streak_count INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  favorite_emojis TEXT[] DEFAULT ARRAY['😊', '👍', '❤️', '😂', '🔥'],
  premium_tier TEXT DEFAULT 'free' CHECK (premium_tier IN ('free', 'premium', 'pro')),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  timezone TEXT,
  language TEXT DEFAULT 'en',
  notification_settings JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  expo_push_token TEXT,
  is_online BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel', 'broadcast')),
  description TEXT,
  avatar_url TEXT,
  created_by UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  customization JSONB DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  last_message_id UUID,
  join_link TEXT,
  join_link_expires_at TIMESTAMPTZ,
  is_encrypted BOOLEAN DEFAULT false,
  encryption_key TEXT,
  auto_delete_timer INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat members table
CREATE TABLE IF NOT EXISTS chat_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  pinned_message_id UUID,
  UNIQUE(chat_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'voice', 'file', 'location', 'contact', 'sticker', 'gif', 'poll')),
  attachments JSONB DEFAULT '[]',
  reply_to UUID REFERENCES messages(id),
  reactions JSONB DEFAULT '[]',
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_starred BOOLEAN DEFAULT false,
  is_temporary BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  viewed BOOLEAN DEFAULT false,
  forward_count INTEGER DEFAULT 0,
  original_sender_id UUID REFERENCES users(id),
  translation JSONB,
  encryption_key TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content JSONB DEFAULT '[]',
  viewers JSONB DEFAULT '[]',
  privacy TEXT DEFAULT 'friends' CHECK (privacy IN ('public', 'friends', 'close_friends', 'custom')),
  is_highlight BOOLEAN DEFAULT false,
  highlight_title TEXT,
  music JSONB,
  location JSONB,
  mentions TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media JSONB DEFAULT '[]',
  caption TEXT,
  privacy TEXT DEFAULT 'friends' CHECK (privacy IN ('public', 'friends', 'custom')),
  location JSONB,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  translations JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'audio' CHECK (type IN ('audio', 'video')),
  status TEXT DEFAULT 'calling' CHECK (status IN ('calling', 'accepted', 'rejected', 'missed', 'ended')),
  channel_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  call_url TEXT,
  recording_url TEXT,
  participants JSONB DEFAULT '[]',
  call_quality TEXT,
  network_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice notes table
CREATE TABLE IF NOT EXISTS voice_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'message', 'story', 'mention', 'like', 'reaction', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo game sessions table
CREATE TABLE IF NOT EXISTS solo_game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT false,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE solo_game_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users policies
CREATE POLICY "Users can read all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Friends policies
CREATE POLICY "Users can read own friends" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can insert own friendships" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own friendships" ON friends FOR DELETE USING (auth.uid() = user_id);

-- Friend requests policies
CREATE POLICY "Users can read own requests" ON friend_requests FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can send requests" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update received requests" ON friend_requests FOR UPDATE USING (auth.uid() = to_user_id);

-- Chat members policies
CREATE POLICY "Users can read own chat memberships" ON chat_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memberships" ON chat_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memberships" ON chat_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memberships" ON chat_members FOR DELETE USING (auth.uid() = user_id);

-- Chats policies
CREATE POLICY "Users can read chats they're members of" ON chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_members WHERE chat_id = chats.id AND user_id = auth.uid())
);
CREATE POLICY "Users can create chats" ON chats FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Chat admins can update chats" ON chats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chat_members WHERE chat_id = chats.id AND user_id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Messages policies
CREATE POLICY "Users can read messages from their chats" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_members WHERE chat_id = messages.chat_id AND user_id = auth.uid())
);
CREATE POLICY "Users can send messages to their chats" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (SELECT 1 FROM chat_members WHERE chat_id = messages.chat_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete own messages" ON messages FOR DELETE USING (auth.uid() = sender_id);

-- Stories policies
CREATE POLICY "Users can read public stories" ON stories FOR SELECT USING (privacy = 'public' OR auth.uid() = user_id);
CREATE POLICY "Users can create own stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stories" ON stories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() = user_id);

-- Posts policies
CREATE POLICY "Users can read public posts" ON posts FOR SELECT USING (privacy = 'public' OR auth.uid() = user_id);
CREATE POLICY "Users can create own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- Calls policies
CREATE POLICY "Users can read own calls" ON calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can create calls" ON calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can update calls they're part of" ON calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Voice notes policies
CREATE POLICY "Users can read own voice notes" ON voice_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own voice notes" ON voice_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own voice notes" ON voice_notes FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Solo game sessions policies
CREATE POLICY "Users can read own game sessions" ON solo_game_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own game sessions" ON solo_game_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions

-- Function to create user profile
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start or get direct chat
CREATE OR REPLACE FUNCTION start_or_get_chat(user_a UUID, user_b UUID)
RETURNS UUID AS $$
DECLARE
  chat_id UUID;
  chat_name TEXT;
BEGIN
  -- Check if direct chat already exists
  SELECT c.id INTO chat_id
  FROM chats c
  JOIN chat_members cm1 ON c.id = cm1.chat_id AND cm1.user_id = user_a
  JOIN chat_members cm2 ON c.id = cm2.chat_id AND cm2.user_id = user_b
  WHERE c.type = 'direct'
  LIMIT 1;
  
  -- If chat doesn't exist, create it
  IF chat_id IS NULL THEN
    -- Generate chat name
    SELECT CONCAT(u1.username, '_', u2.username) INTO chat_name
    FROM users u1, users u2
    WHERE u1.id = user_a AND u2.id = user_b;
    
    -- Create chat
    INSERT INTO chats (name, type, created_by)
    VALUES (chat_name, 'direct', user_a)
    RETURNING id INTO chat_id;
    
    -- Add both users as members
    INSERT INTO chat_members (chat_id, user_id, role)
    VALUES 
      (chat_id, user_a, 'member'),
      (chat_id, user_b, 'member');
  END IF;
  
  RETURN chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a call
CREATE OR REPLACE FUNCTION start_call(caller UUID, receiver UUID, call_type TEXT)
RETURNS TEXT AS $$
DECLARE
  channel_id TEXT;
  call_id UUID;
BEGIN
  -- Generate unique channel ID
  channel_id := 'call_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
  
  -- Create call record
  INSERT INTO calls (caller_id, receiver_id, type, channel_id, status)
  VALUES (caller, receiver, call_type, channel_id, 'calling')
  RETURNING id INTO call_id;
  
  RETURN channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created_at ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_id ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id_expires_at ON stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id_status ON calls(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);

-- Views for better performance
CREATE OR REPLACE VIEW chat_profiles AS
SELECT 
  cm.chat_id,
  cm.user_id,
  u.username,
  u.display_name,
  u.avatar_url,
  u.status,
  u.last_seen
FROM chat_members cm
JOIN users u ON cm.user_id = u.id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;