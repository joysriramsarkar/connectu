-- Migration 002: Block, mute, and follow requests for private accounts
--
-- blocks: bidirectional blocking — both directions are checked.
-- mutes:  soft silencing — the muted user can still see the muter.
-- follow_requests: for private accounts that require approval.

BEGIN;

-- Block table
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  -- Prevent self-block
  CONSTRAINT blocks_no_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocks_blocked_id_idx ON blocks (blocked_id);

-- Mute table
CREATE TABLE IF NOT EXISTS mutes (
  muter_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id),
  CONSTRAINT mutes_no_self CHECK (muter_id <> muted_id)
);

-- Follow requests (for private accounts)
CREATE TABLE IF NOT EXISTS follow_requests (
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requester_id, target_id),
  CONSTRAINT follow_requests_no_self CHECK (requester_id <> target_id)
);

-- Add is_private column to users if not present
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follows_no_self'
  ) THEN
    ALTER TABLE follows
      ADD CONSTRAINT follows_no_self CHECK (follower_id <> following_id);
  END IF;
END $$;

COMMIT;
