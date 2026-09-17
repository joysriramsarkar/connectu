-- Migration 003: Bookmarks (saved posts)

BEGIN;

CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Index for fetching a user's bookmarks ordered by recency
CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx
  ON bookmarks (user_id, created_at DESC);

COMMIT;
