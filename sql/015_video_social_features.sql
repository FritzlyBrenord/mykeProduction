-- Video social features:
-- - likes on videos
-- - comments on videos
-- - likes on video comments
-- - unique view tracking for videos

ALTER TABLE IF EXISTS videos
  ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS commentaires
  ADD COLUMN IF NOT EXISTS video_id UUID REFERENCES videos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_commentaires_video_id
  ON commentaires(video_id)
  WHERE video_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS video_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id        UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id       TEXT,
  viewer_key      TEXT NOT NULL,
  user_agent      TEXT,
  ip_hash         TEXT,
  first_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, viewer_key)
);

CREATE INDEX IF NOT EXISTS idx_video_views_video_id
  ON video_views(video_id);

CREATE INDEX IF NOT EXISTS idx_video_views_user_id
  ON video_views(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS video_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id   UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id  TEXT,
  liker_key  TEXT NOT NULL,
  user_agent TEXT,
  ip_hash    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (video_id, liker_key)
);

CREATE INDEX IF NOT EXISTS idx_video_likes_video_id
  ON video_likes(video_id);

CREATE INDEX IF NOT EXISTS idx_video_likes_user_id
  ON video_likes(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS video_commentaire_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commentaire_id UUID NOT NULL REFERENCES commentaires(id) ON DELETE CASCADE,
  video_id      UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id     TEXT,
  liker_key     TEXT NOT NULL,
  user_agent    TEXT,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (commentaire_id, liker_key)
);

CREATE INDEX IF NOT EXISTS idx_video_commentaire_likes_commentaire_id
  ON video_commentaire_likes(commentaire_id);

CREATE INDEX IF NOT EXISTS idx_video_commentaire_likes_video_id
  ON video_commentaire_likes(video_id);
