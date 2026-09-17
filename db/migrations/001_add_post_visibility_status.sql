-- Migration 001: Post visibility, status & content lifecycle
-- Run this migration before deploying code that references these columns.
--
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING patterns used).

BEGIN;

-- Add visibility to posts (public = everyone, followers = followers only, private = author only)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'followers', 'private')),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed', 'deleted')),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'posts_content_length'
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_content_length
        CHECK (char_length(content) BETWEEN 1 AND 2000);
  END IF;
END $$;

-- Index: feed query by author + created time (for cursor pagination)
CREATE INDEX IF NOT EXISTS posts_author_created_id_idx
  ON posts (author_id, created_at DESC, id DESC);

-- Index: public active posts ordered by time (global timeline)
CREATE INDEX IF NOT EXISTS posts_visibility_status_created_idx
  ON posts (visibility, status, created_at DESC, id DESC)
  WHERE visibility = 'public' AND status = 'active';

COMMIT;
