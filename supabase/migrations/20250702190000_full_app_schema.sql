-- FULL APP SCHEMA MIGRATION: All features, all logic, all policies

-- === USERS TABLE (minimal, for reference; adjust as needed for your auth provider) ===
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  status text DEFAULT 'online',
  last_seen timestamptz DEFAULT now(),
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expo_push_token text -- Expo push notification token
);

-- === ONE-TIME DATA FIXES (from scripts/URGENT_FIX.sql and backfill_users.sql) ===

-- 1. Backfill missing users from auth.users into public.users with unique username logic
INSERT INTO public.users (id, email, username, display_name)
SELECT
  u.id,
  u.email,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM public.users pu
      WHERE pu.username = split_part(u.email, '@', 1)
    )
    THEN split_part(u.email, '@', 1) || '_' || left(u.id::text, 8)
    ELSE split_part(u.email, '@', 1)
  END AS username,
  initcap(split_part(u.email, '@', 1)) AS display_name
FROM auth.users u
LEFT JOIN public.users pu ON pu.id = u.id
WHERE pu.id IS NULL
ON CONFLICT (username) DO NOTHING;  -- Avoids duplicate username errors

-- NOTE: For any future user/profile inserts, always use ON CONFLICT (username) DO NOTHING to avoid duplicate username errors due to the check_username_unique() trigger.

-- 2. Trim usernames and display names in public.users (fix trailing spaces)
UPDATE public.users 
SET 
  username = trim(username),
  display_name = trim(display_name)
WHERE 
  username != trim(username) 
  OR display_name != trim(display_name);

-- === ROBUST USER PROFILE CREATION TRIGGER/FUNCTION (from URGENT_FIX.sql) ===

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.create_user_profile();

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
    INSERT INTO public.users (
      id,
      email,
      username,
      display_name,
      last_seen,
      is_online
    ) VALUES (
      NEW.id,
      NEW.email,
      trim(COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))),
      trim(COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User')),
      now(),
      false
    )
    ON CONFLICT (username) DO NOTHING; -- Avoids duplicate username errors
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- === FRIENDS SYSTEM (FIXED STRUCTURE) ===
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

CREATE TABLE IF NOT EXISTS public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- === STORIES BACKEND ===
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  viewers jsonb DEFAULT '[]'::jsonb,
  privacy text DEFAULT 'friends' CHECK (privacy IN ('public', 'friends', 'close_friends', 'custom')),
  is_highlight boolean DEFAULT false,
  highlight_title text,
  music jsonb,
  location jsonb,
  mentions text[] DEFAULT ARRAY[]::text[],
  hashtags text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- === POSTS BACKEND (Persistent Feed) ===
-- Add audio_url, is_pinned, analytics, and translations support
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS audio_url text; -- For audio posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false; -- For pinning posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS analytics jsonb DEFAULT '{}'; -- For storing like/comment/share counts, view counts, etc.
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'; -- For storing translations of captions/comments

-- Add index for pinned posts
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON public.posts(is_pinned);

-- Add index for analytics
CREATE INDEX IF NOT EXISTS idx_posts_analytics ON public.posts USING gin (analytics);

-- Add index for translations
CREATE INDEX IF NOT EXISTS idx_posts_translations ON public.posts USING gin (translations);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  media jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{type: 'image'|'video', url: '...'}]
  caption text,
  location text,
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON public.post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON public.post_shares(user_id);

-- RLS Policies for posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view posts" ON public.posts;
CREATE POLICY "Users can view posts"
  ON public.posts
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can insert posts" ON public.posts;
CREATE POLICY "Users can insert posts"
  ON public.posts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their posts" ON public.posts;
CREATE POLICY "Users can update their posts"
  ON public.posts
  FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their posts" ON public.posts;
CREATE POLICY "Users can delete their posts"
  ON public.posts
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for post_likes
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view post likes" ON public.post_likes;
CREATE POLICY "Users can view post likes"
  ON public.post_likes
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts"
  ON public.post_likes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts"
  ON public.post_likes
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for post_comments
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view post comments" ON public.post_comments;
CREATE POLICY "Users can view post comments"
  ON public.post_comments
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can comment on posts" ON public.post_comments;
CREATE POLICY "Users can comment on posts"
  ON public.post_comments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can edit their comments" ON public.post_comments;
CREATE POLICY "Users can edit their comments"
  ON public.post_comments
  FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their comments" ON public.post_comments;
CREATE POLICY "Users can delete their comments"
  ON public.post_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for post_shares
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view post shares" ON public.post_shares;
CREATE POLICY "Users can view post shares"
  ON public.post_shares
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can share posts" ON public.post_shares;
CREATE POLICY "Users can share posts"
  ON public.post_shares
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their shares" ON public.post_shares;
CREATE POLICY "Users can delete their shares"
  ON public.post_shares
  FOR DELETE
  USING (user_id = auth.uid());

-- === CHATS ===
CREATE TABLE IF NOT EXISTS public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'channel', 'broadcast')),
  description text,
  avatar_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  settings jsonb DEFAULT '{}',
  customization jsonb DEFAULT '{}',
  is_archived boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_message_id uuid
);

CREATE TABLE IF NOT EXISTS public.chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator', 'owner')),
  joined_at timestamptz DEFAULT now(),
  last_read_at timestamptz DEFAULT now(),
  is_muted boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'voice', 'file', 'location', 'contact', 'sticker', 'gif', 'poll')),
  attachments jsonb DEFAULT '[]'::jsonb,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  is_edited boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_temporary boolean DEFAULT false,
  expires_at timestamptz,
  viewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- === BLOCKS SYSTEM ===
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- === Helper Functions and Triggers ===
-- Removed add_chat_creator_to_members trigger and function to fix RLS issues
-- CREATE OR REPLACE FUNCTION public.add_chat_creator_to_members()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM public.chat_members WHERE chat_id = NEW.id AND user_id = NEW.created_by
--   ) THEN
--     INSERT INTO public.chat_members (chat_id, user_id, role, joined_at)
--     VALUES (NEW.id, NEW.created_by, 'owner', now());
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS trigger_add_chat_creator_to_members ON public.chats;
-- CREATE TRIGGER trigger_add_chat_creator_to_members
--   AFTER INSERT ON public.chats
--   FOR EACH ROW
--   EXECUTE FUNCTION public.add_chat_creator_to_members();

DROP FUNCTION IF EXISTS public.start_or_get_chat(uuid, uuid);

CREATE OR REPLACE FUNCTION public.start_or_get_chat(user_a uuid, user_b uuid)
RETURNS uuid AS $$
DECLARE
  new_chat_id uuid;
  first_user uuid;
  second_user uuid;
BEGIN
  -- Always order the user IDs to avoid duplicate chats
  IF user_a < user_b THEN
    first_user := user_a;
    second_user := user_b;
  ELSE
    first_user := user_b;
    second_user := user_a;
  END IF;

  -- Try to find existing direct chat (regardless of order)
  SELECT c.id INTO new_chat_id
  FROM public.chats c
  JOIN public.chat_members m1 ON c.id = m1.chat_id AND m1.user_id = first_user
  JOIN public.chat_members m2 ON c.id = m2.chat_id AND m2.user_id = second_user
  WHERE c.type = 'direct'
  GROUP BY c.id
  HAVING COUNT(DISTINCT m1.user_id) = 1 AND COUNT(DISTINCT m2.user_id) = 1
  LIMIT 1;

  IF new_chat_id IS NOT NULL THEN
    RETURN new_chat_id;
  END IF;

  -- Create new chat, set created_by to auth.uid()
  INSERT INTO public.chats (name, type, created_by)
  VALUES ('Direct Chat', 'direct', auth.uid())
  RETURNING id INTO new_chat_id;

  -- Add both users as members
  INSERT INTO public.chat_members (chat_id, user_id, role)
  VALUES (new_chat_id, first_user, 'owner')
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  INSERT INTO public.chat_members (chat_id, user_id, role)
  VALUES (new_chat_id, second_user, 'member')
  ON CONFLICT (chat_id, user_id) DO NOTHING;

  RETURN new_chat_id;
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION public.start_or_get_chat(uuid, uuid) TO authenticated;

-- Step 1: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_chat_on_accept ON public.friend_requests;
DROP FUNCTION IF EXISTS public.auto_create_chat_on_accept;

-- Step 2: Create trigger function
CREATE OR REPLACE FUNCTION public.auto_create_chat_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  chat_id uuid;
BEGIN
  -- Only run when status changes to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Create chat automatically
    chat_id := public.start_or_get_chat(NEW.from_user_id, NEW.to_user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger on UPDATE
CREATE TRIGGER trigger_create_chat_on_accept
AFTER UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_chat_on_accept();

-- RLS for chats and chat_members (ensure both users can see/access the chat)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
CREATE POLICY "Users can view their chats"
  ON public.chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = chats.id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
CREATE POLICY "Users can insert chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (created_by = auth.uid());
-- Only the user creating the chat can insert; do not check chat_members here, as they do not exist yet at insert time.

DROP POLICY IF EXISTS "Users can update their chats" ON public.chats;
CREATE POLICY "Users can update their chats"
  ON public.chats
  FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their chats" ON public.chats;
CREATE POLICY "Users can delete their chats"
  ON public.chats
  FOR DELETE
  USING (created_by = auth.uid());

ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their chat memberships" ON public.chat_members;
CREATE POLICY "Users can view their chat memberships"
  ON public.chat_members
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert chat memberships" ON public.chat_members;
CREATE POLICY "Users can insert chat memberships"
  ON public.chat_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their chat memberships" ON public.chat_members;
CREATE POLICY "Users can update their chat memberships"
  ON public.chat_members
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their chat memberships" ON public.chat_members;
CREATE POLICY "Users can delete their chat memberships"
  ON public.chat_members
  FOR DELETE
  USING (user_id = auth.uid());

-- === Indexes for performance ===
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user_id ON public.friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_id ON public.friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_privacy ON public.stories(privacy);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON public.chats(created_by);
CREATE INDEX IF NOT EXISTS idx_chats_type ON public.chats(type);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id ON public.chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON public.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- === RLS Policies ===

-- USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles"
  ON public.users
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;
CREATE POLICY "Users can delete their own profile"
  ON public.users
  FOR DELETE
  USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- FRIENDS TABLE
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their friendships" ON public.friends;
CREATE POLICY "Users can view their friendships"
  ON public.friends
  FOR SELECT
  USING (user_id = auth.uid() OR friend_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert friendships" ON public.friends;
CREATE POLICY "Users can insert friendships"
  ON public.friends
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their friendships" ON public.friends;
CREATE POLICY "Users can update their friendships"
  ON public.friends
  FOR UPDATE
  USING (user_id = auth.uid() OR friend_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their friendships" ON public.friends;
CREATE POLICY "Users can delete their friendships"
  ON public.friends
  FOR DELETE
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND REQUESTS TABLE
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their friend requests" ON public.friend_requests;
CREATE POLICY "Users can view their friend requests"
  ON public.friend_requests
  FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert friend requests" ON public.friend_requests;
CREATE POLICY "Users can insert friend requests"
  ON public.friend_requests
  FOR INSERT
  WITH CHECK (from_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their friend requests" ON public.friend_requests;
CREATE POLICY "Users can update their friend requests"
  ON public.friend_requests
  FOR UPDATE
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their friend requests" ON public.friend_requests;
CREATE POLICY "Users can delete their friend requests"
  ON public.friend_requests
  FOR DELETE
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- USER BLOCKS TABLE
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their blocks" ON public.user_blocks;
CREATE POLICY "Users can view their blocks"
  ON public.user_blocks
  FOR SELECT
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert blocks" ON public.user_blocks;
CREATE POLICY "Users can insert blocks"
  ON public.user_blocks
  FOR INSERT
  WITH CHECK (blocker_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their blocks" ON public.user_blocks;
CREATE POLICY "Users can update their blocks"
  ON public.user_blocks
  FOR UPDATE
  USING (blocker_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their blocks" ON public.user_blocks;
CREATE POLICY "Users can delete their blocks"
  ON public.user_blocks
  FOR DELETE
  USING (blocker_id = auth.uid());

-- STORIES TABLE
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view stories" ON public.stories;
CREATE POLICY "Users can view stories"
  ON public.stories
  FOR SELECT
  USING (
    privacy = 'public' OR
    user_id = auth.uid() OR
    (privacy = 'friends' AND EXISTS (
      SELECT 1 FROM public.friends 
      WHERE (user_id = auth.uid() AND friend_id = stories.user_id) OR
            (friend_id = auth.uid() AND user_id = stories.user_id)
    ))
  );
DROP POLICY IF EXISTS "Users can insert their own stories" ON public.stories;
CREATE POLICY "Users can insert their own stories"
  ON public.stories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own stories" ON public.stories;
CREATE POLICY "Users can update their own stories"
  ON public.stories
  FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
CREATE POLICY "Users can delete their own stories"
  ON public.stories
  FOR DELETE
  USING (user_id = auth.uid());

-- STORY VIEWS TABLE
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view story views" ON public.story_views;
CREATE POLICY "Users can view story views"
  ON public.story_views
  FOR SELECT
  USING (viewer_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert story views" ON public.story_views;
CREATE POLICY "Users can insert story views"
  ON public.story_views
  FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- CHATS TABLE
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their chats" ON public.chats;
CREATE POLICY "Users can view their chats"
  ON public.chats
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = chats.id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can insert chats" ON public.chats;
CREATE POLICY "Users can insert chats"
  ON public.chats
  FOR INSERT
  WITH CHECK (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can update their chats" ON public.chats;
CREATE POLICY "Users can update their chats"
  ON public.chats
  FOR UPDATE
  USING (created_by = auth.uid());
DROP POLICY IF EXISTS "Users can delete their chats" ON public.chats;
CREATE POLICY "Users can delete their chats"
  ON public.chats
  FOR DELETE
  USING (created_by = auth.uid());

-- CHAT MEMBERS TABLE
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their chat memberships" ON public.chat_members;
CREATE POLICY "Users can view their chat memberships"
  ON public.chat_members
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert chat memberships" ON public.chat_members;
CREATE POLICY "Users can insert chat memberships"
  ON public.chat_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their chat memberships" ON public.chat_members;
CREATE POLICY "Users can update their chat memberships"
  ON public.chat_members
  FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their chat memberships" ON public.chat_members;
CREATE POLICY "Users can delete their chat memberships"
  ON public.chat_members
  FOR DELETE
  USING (user_id = auth.uid());

-- MESSAGES TABLE
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.messages;
CREATE POLICY "Users can view messages in their chats"
  ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
CREATE POLICY "Users can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- === CHAT PROFILES VIEW (for direct chat header info) ===
CREATE OR REPLACE VIEW public.chat_profiles AS
SELECT
  cm.chat_id,
  u.id AS user_id,
  u.username,
  u.avatar_url
FROM public.chat_members cm
JOIN public.users u ON u.id = cm.user_id;

-- === TYPING INDICATOR TABLE & RLS ===
CREATE TABLE IF NOT EXISTS public.typing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_id)
);
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View typing in chat" ON public.typing_status;
CREATE POLICY "View typing in chat" ON public.typing_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_members 
      WHERE chat_id = typing_status.chat_id AND user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Update own typing" ON public.typing_status;
CREATE POLICY "Update own typing" ON public.typing_status
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Insert typing" ON public.typing_status;
CREATE POLICY "Insert typing" ON public.typing_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- === STARRED MESSAGES TABLE & RLS ===
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their starred messages" ON public.starred_messages;
CREATE POLICY "Users can manage their starred messages" ON public.starred_messages
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- === PINNED MESSAGE SUPPORT (per chat) ===
ALTER TABLE public.chat_members
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.messages(id);

-- === VOICE MESSAGE SUPPORT (audio_url in messages) ===
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_url text;

-- === SEEN/DELIVERED LOGIC (message_status table) ===
CREATE TABLE IF NOT EXISTS public.message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  status text CHECK (status IN ('delivered', 'seen')) DEFAULT 'delivered',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their message statuses" ON public.message_status;
CREATE POLICY "Users can view their message statuses" ON public.message_status
  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update message statuses" ON public.message_status;
CREATE POLICY "Users can update message statuses" ON public.message_status
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert message statuses" ON public.message_status;
CREATE POLICY "Users can insert message statuses" ON public.message_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- === CALLS TABLE (Voice/Video Calling) ===
CREATE TABLE IF NOT EXISTS public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  type text CHECK (type IN ('audio', 'video')) DEFAULT 'audio',
  status text CHECK (status IN ('calling', 'ringing', 'accepted', 'rejected', 'missed', 'ended')) DEFAULT 'calling',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for calls
CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON public.calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON public.calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON public.calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON public.calls(created_at);

-- RLS Policies for calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can access their calls" ON public.calls;
CREATE POLICY "Users can access their calls" ON public.calls
  FOR SELECT USING (
    caller_id = auth.uid() OR receiver_id = auth.uid()
  );
DROP POLICY IF EXISTS "Users can insert calls" ON public.calls;
CREATE POLICY "Users can insert calls" ON public.calls
  FOR INSERT WITH CHECK (
    caller_id = auth.uid()
  );
DROP POLICY IF EXISTS "Users can update their calls" ON public.calls;
CREATE POLICY "Users can update their calls" ON public.calls
  FOR UPDATE USING (
    caller_id = auth.uid() OR receiver_id = auth.uid()
  );

-- start_call function
DROP FUNCTION IF EXISTS public.start_call(uuid, uuid, text);
CREATE OR REPLACE FUNCTION public.start_call(caller uuid, receiver uuid, call_type text DEFAULT 'audio')
RETURNS uuid AS $$
DECLARE
  call_id uuid;
BEGIN
  INSERT INTO public.calls (caller_id, receiver_id, type, channel_id)
  VALUES (caller, receiver, call_type, gen_random_uuid()::text)
  RETURNING id INTO call_id;
  RETURN call_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.start_call(uuid, uuid, text) TO authenticated;

-- End of migration 

ALTER TABLE friend_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE friend_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add missing last_seen column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();
-- Add missing is_online column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;

-- === TRIGGERS: Auto-update updated_at on row change ===
-- Users
CREATE OR REPLACE FUNCTION public.set_updated_at_users()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_users();

-- Chats
CREATE OR REPLACE FUNCTION public.set_updated_at_chats()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at_chats ON public.chats;
CREATE TRIGGER set_updated_at_chats
  BEFORE UPDATE ON public.chats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_chats();

-- Chat Members
CREATE OR REPLACE FUNCTION public.set_updated_at_chat_members()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
ALTER TABLE public.chat_members ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
DROP TRIGGER IF EXISTS set_updated_at_chat_members ON public.chat_members;
CREATE TRIGGER set_updated_at_chat_members
  BEFORE UPDATE ON public.chat_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_chat_members();

-- Messages
CREATE OR REPLACE FUNCTION public.set_updated_at_messages()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at_messages ON public.messages;
CREATE TRIGGER set_updated_at_messages
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_messages();

-- Friends
CREATE OR REPLACE FUNCTION public.set_updated_at_friends()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at_friends ON public.friends;
CREATE TRIGGER set_updated_at_friends
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_friends();

-- Friend Requests
CREATE OR REPLACE FUNCTION public.set_updated_at_friend_requests()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at_friend_requests ON public.friend_requests;
CREATE TRIGGER set_updated_at_friend_requests
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_friend_requests();

-- === INDEXES FOR SEARCH PERFORMANCE ===
CREATE INDEX IF NOT EXISTS idx_messages_content ON public.messages USING gin (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_chats_name ON public.chats USING gin (to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users USING gin (to_tsvector('english', display_name));

-- === PRESENCE: Update last_seen on activity (optional, recommended) ===
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET last_seen = now(), is_online = true WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Example: Attach this trigger to message insert for real-time presence
DROP TRIGGER IF EXISTS update_last_seen_on_message_insert ON public.messages;
CREATE TRIGGER update_last_seen_on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_seen();

-- === FOLLOWERS TABLE ===
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  followed_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, followed_id)
);

-- === SAVED POSTS TABLE ===
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- === TAGS TABLE ===
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  tagged_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, tagged_user_id)
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON public.followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_followed_id ON public.followers(followed_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_tags_post_id ON public.tags(post_id);
CREATE INDEX IF NOT EXISTS idx_tags_tagged_user_id ON public.tags(tagged_user_id);

-- RLS for followers
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their followers" ON public.followers;
CREATE POLICY "Users can view their followers"
  ON public.followers
  FOR SELECT
  USING (follower_id = auth.uid() OR followed_id = auth.uid());
DROP POLICY IF EXISTS "Users can follow" ON public.followers;
CREATE POLICY "Users can follow"
  ON public.followers
  FOR INSERT
  WITH CHECK (follower_id = auth.uid());
DROP POLICY IF EXISTS "Users can unfollow" ON public.followers;
CREATE POLICY "Users can unfollow"
  ON public.followers
  FOR DELETE
  USING (follower_id = auth.uid());

-- RLS for saved_posts
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their saved posts" ON public.saved_posts;
CREATE POLICY "Users can view their saved posts"
  ON public.saved_posts
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can save posts" ON public.saved_posts;
CREATE POLICY "Users can save posts"
  ON public.saved_posts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can unsave posts" ON public.saved_posts;
CREATE POLICY "Users can unsave posts"
  ON public.saved_posts
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view tags" ON public.tags;
CREATE POLICY "Users can view tags"
  ON public.tags
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can tag others" ON public.tags;
CREATE POLICY "Users can tag others"
  ON public.tags
  FOR INSERT
  WITH CHECK (post_id IS NOT NULL AND tagged_user_id IS NOT NULL);
DROP POLICY IF EXISTS "Users can remove tags" ON public.tags;
CREATE POLICY "Users can remove tags"
  ON public.tags
  FOR DELETE
  USING (true);

-- Blocked users cannot follow or message (enforced in app logic and optionally with a view or function)

-- === SEED DATA: 3 users, 5+ posts each, follows, tags, saved ===
-- Users
INSERT INTO public.users (id, email, username, display_name, avatar_url, bio, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alice@example.com', 'alice', 'Alice', 'https://randomuser.me/api/portraits/women/1.jpg', 'Love hiking and photography.', 'online'),
  ('00000000-0000-0000-0000-000000000002', 'bob@example.com', 'bob', 'Bob', 'https://randomuser.me/api/portraits/men/2.jpg', 'Coffee addict. Tech enthusiast.', 'online'),
  ('00000000-0000-0000-0000-000000000003', 'carol@example.com', 'carol', 'Carol', 'https://randomuser.me/api/portraits/women/3.jpg', 'Traveler. Bookworm.', 'online')
ON CONFLICT (id) DO NOTHING;

-- Posts (5 per user, mix of image/video/text)
INSERT INTO public.posts (id, user_id, media, caption, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '[{"type":"image","url":"https://picsum.photos/id/1011/400/400"}]', 'Sunset at the lake!', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '[{"type":"video","url":"https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"}]', 'Check out this cool video!', now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '[{"type":"image","url":"https://picsum.photos/id/1012/400/400"}]', 'Nature walk.', now()),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '[{"type":"text","url":""}]', 'Just finished a great book!', now()),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '[{"type":"image","url":"https://picsum.photos/id/1013/400/400"}]', 'City lights.', now()),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '[{"type":"image","url":"https://picsum.photos/id/1021/400/400"}]', 'Morning coffee vibes.', now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '[{"type":"video","url":"https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"}]', 'Throwback to last summer.', now()),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', '[{"type":"image","url":"https://picsum.photos/id/1022/400/400"}]', 'At the tech conference.', now()),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '[{"type":"text","url":""}]', 'Learning React Native!', now()),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', '[{"type":"image","url":"https://picsum.photos/id/1023/400/400"}]', 'Best burger in town.', now()),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', '[{"type":"image","url":"https://picsum.photos/id/1031/400/400"}]', 'Wanderlust.', now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '[{"type":"video","url":"https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4"}]', 'Book fair memories.', now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '[{"type":"image","url":"https://picsum.photos/id/1032/400/400"}]', 'Reading spot.', now()),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', '[{"type":"text","url":""}]', 'Travel plans for 2025!', now()),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000003', '[{"type":"image","url":"https://picsum.photos/id/1033/400/400"}]', 'Library day.', now())
ON CONFLICT (id) DO NOTHING;

-- Follows
INSERT INTO public.followers (follower_id, followed_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Tags
INSERT INTO public.tags (post_id, tagged_user_id)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Saved posts
INSERT INTO public.saved_posts (user_id, post_id)
VALUES
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- === SOLO GAMES SYSTEM ===
CREATE TABLE IF NOT EXISTS public.solo_game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('flappy_bird','reaction_time','memory_match','2048','tap_the_dot','snake','typing_speed','simon_says','fifteen_puzzle','quick_quiz')),
  score integer NOT NULL,
  level integer DEFAULT 1,
  completed boolean DEFAULT FALSE,
  xp_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.solo_leaderboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('flappy_bird','reaction_time','memory_match','2048','tap_the_dot','snake','typing_speed','simon_says','fifteen_puzzle','quick_quiz')),
  high_score integer,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(user_id, game_type)
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  badge_name text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_name)
);

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  game_type text NOT NULL CHECK (game_type IN ('flappy_bird','reaction_time','memory_match','2048','tap_the_dot','snake','typing_speed','simon_says','fifteen_puzzle','quick_quiz')),
  completed boolean DEFAULT FALSE,
  xp_rewarded boolean DEFAULT FALSE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, assigned_at)
);

CREATE TABLE IF NOT EXISTS public.spin_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  reward_type text NOT NULL CHECK (reward_type IN ('xp','badge','coins','extra_spin','none')),
  value integer DEFAULT 0,
  earned_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_solo_game_sessions_user_id ON public.solo_game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_solo_leaderboards_user_id ON public.solo_leaderboards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_id ON public.daily_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_spin_rewards_user_id ON public.spin_rewards(user_id);

-- RLS Policies
ALTER TABLE public.solo_game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their solo game sessions" ON public.solo_game_sessions;
CREATE POLICY "Users can view their solo game sessions"
  ON public.solo_game_sessions
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their solo game sessions" ON public.solo_game_sessions;
CREATE POLICY "Users can insert their solo game sessions"
  ON public.solo_game_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.solo_leaderboards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their solo leaderboards" ON public.solo_leaderboards;
CREATE POLICY "Users can view their solo leaderboards"
  ON public.solo_leaderboards
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert/update their solo leaderboards" ON public.solo_leaderboards;
CREATE POLICY "Users can insert/update their solo leaderboards"
  ON public.solo_leaderboards
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their achievements" ON public.user_achievements;
CREATE POLICY "Users can view their achievements"
  ON public.user_achievements
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their achievements" ON public.user_achievements;
CREATE POLICY "Users can insert their achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their daily challenges" ON public.daily_challenges;
CREATE POLICY "Users can view their daily challenges"
  ON public.daily_challenges
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert/update their daily challenges" ON public.daily_challenges;
CREATE POLICY "Users can insert/update their daily challenges"
  ON public.daily_challenges
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.spin_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their spin rewards" ON public.spin_rewards;
CREATE POLICY "Users can view their spin rewards"
  ON public.spin_rewards
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their spin rewards" ON public.spin_rewards;
CREATE POLICY "Users can insert their spin rewards"
  ON public.spin_rewards
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Anti-abuse: Add a simple rate limit function for solo_game_sessions
DROP FUNCTION IF EXISTS public.can_submit_solo_game_session(uuid, text);
CREATE OR REPLACE FUNCTION public.can_submit_solo_game_session(uid uuid, gtype text)
RETURNS boolean AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count FROM public.solo_game_sessions
    WHERE user_id = uid AND game_type = gtype AND created_at > (now() - interval '10 seconds');
  RETURN recent_count < 3;
END;  
$$ LANGUAGE plpgsql;

-- === POST REACTIONS TABLE ===
DROP TABLE IF EXISTS public.post_reactions CASCADE;
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON public.post_reactions(user_id);
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view post reactions" ON public.post_reactions;
CREATE POLICY "Users can view post reactions"
  ON public.post_reactions
  FOR SELECT
  USING (true);
DROP POLICY IF EXISTS "Users can react to posts" ON public.post_reactions;
CREATE POLICY "Users can react to posts"
  ON public.post_reactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.post_reactions;
CREATE POLICY "Users can remove their reactions"
  ON public.post_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- === POST REPORTS TABLE ===
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_reports_post_id ON public.post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_user_id ON public.post_reports(user_id);
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their post reports" ON public.post_reports;
CREATE POLICY "Users can view their post reports"
  ON public.post_reports
  FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can report posts" ON public.post_reports;
CREATE POLICY "Users can report posts"
  ON public.post_reports
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- === SUPABASE STORAGE BUCKET AND POLICIES FOR POSTS & STORIES ===
-- NOTE: The following steps MUST be performed manually in the Supabase Dashboard SQL Editor as the project owner.
-- This is required because only the owner can alter storage.objects and create/drop policies on it.
--
-- 1. Go to Supabase Dashboard > SQL Editor
-- 2. Run the following commands one by one:
--
-- Enable RLS on storage.objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
--
-- Drop any existing policy for this bucket
-- DROP POLICY IF EXISTS "Authenticated users can access meaz-storage" ON storage.objects;
--
-- Allow authenticated users full access to all objects in the 'meaz-storage' bucket
-- CREATE POLICY "Authenticated users can access meaz-storage"
--   ON storage.objects
--   FOR ALL
--   USING (
--     bucket_id = 'meaz-storage' AND auth.role() = 'authenticated'
--   )
--   WITH CHECK (
--     bucket_id = 'meaz-storage' AND auth.role() = 'authenticated'
--   );
--
-- (Optional) Allow public read access to files in the bucket:
-- -- CREATE POLICY "Public can read meaz-storage"
-- --   ON storage.objects
-- --   FOR SELECT
-- --   USING (bucket_id = 'meaz-storage');

-- === END STORAGE POLICIES ===