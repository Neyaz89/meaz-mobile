-- Backfill script: Ensure both users are members of every direct chat
-- For each direct chat, if either user is missing from chat_members, add them.

-- 1. Insert the creator as a member (owner) if missing
INSERT INTO chat_members (chat_id, user_id, role)
SELECT c.id, c.created_by, 'owner'
FROM chats c
WHERE c.type = 'direct'
  AND c.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = c.created_by
  );

-- 2. Insert the other member as a member if missing
INSERT INTO chat_members (chat_id, user_id, role)
SELECT c.id, m.user_id, 'member'
FROM chats c
JOIN chat_members m ON c.id = m.chat_id
WHERE c.type = 'direct'
  AND m.user_id != c.created_by
  AND NOT EXISTS (
    SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id != c.created_by AND cm.user_id = m.user_id
  );

-- 3. Optionally, promote the creator to 'owner' if not already
UPDATE chat_members cm
SET role = 'owner'
FROM chats c
WHERE cm.chat_id = c.id AND c.type = 'direct' AND cm.user_id = c.created_by AND cm.role != 'owner'; 