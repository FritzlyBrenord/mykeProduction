-- Global visitor tracking for anonymous users browsing public pages.
-- This table powers admin visitor analytics (day/week/month/year).

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_key   TEXT NOT NULL UNIQUE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id     TEXT,
  country_code  TEXT,
  user_agent    TEXT,
  ip_hash       TEXT,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  last_path     TEXT,
  total_hits    INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen
  ON visitor_sessions(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_user_id
  ON visitor_sessions(user_id)
  WHERE user_id IS NOT NULL;
