-- Migration 004: Performance indexes for common feed/social-graph queries
--
-- These indexes are additive — they do not change any data or constraints.
-- Review EXPLAIN output on actual data before adding all of them; index
-- maintenance costs writes, so only keep indexes that are actually used.

BEGIN;

-- Following feed: posts by accounts the viewer follows
-- Used in: SELECT posts WHERE author_id IN (SELECT following_id FROM follows WHERE follower_id = $viewer)
CREATE INDEX IF NOT EXISTS follows_follower_following_idx
  ON follows (follower_id, following_id);

-- Reverse index: "who follows this account" (for follower count, fan-out)
CREATE INDEX IF NOT EXISTS follows_following_follower_idx
  ON follows (following_id, follower_id);

-- Comments per post, ordered by time (for pagination)
CREATE INDEX IF NOT EXISTS comments_post_created_id_idx
  ON comments (post_id, created_at DESC, id DESC);

-- Likes: check if a specific user liked a specific post quickly
CREATE INDEX IF NOT EXISTS likes_user_post_idx
  ON likes (user_id, post_id);

-- Notifications per recipient, most recent first
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications (recipient_id, created_at DESC);

-- Unread notifications (partial index)
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications (recipient_id)
  WHERE read = FALSE;

-- User handle lookup (case-insensitive search)
CREATE INDEX IF NOT EXISTS users_handle_lower_idx
  ON users (LOWER(handle));

COMMIT;
