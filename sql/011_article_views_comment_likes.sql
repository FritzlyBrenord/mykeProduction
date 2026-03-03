-- Track unique article views by device/user and unique comment likes.

CREATE TABLE IF NOT EXISTS article_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id       TEXT,
  viewer_key      TEXT NOT NULL,
  user_agent      TEXT,
  ip_hash         TEXT,
  first_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (article_id, viewer_key)
);

CREATE INDEX IF NOT EXISTS idx_article_views_article_id
  ON article_views(article_id);

CREATE INDEX IF NOT EXISTS idx_article_views_user_id
  ON article_views(user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS commentaire_likes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commentaire_id UUID NOT NULL REFERENCES commentaires(id) ON DELETE CASCADE,
  article_id    UUID REFERENCES articles(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_id     TEXT,
  liker_key     TEXT NOT NULL,
  user_agent    TEXT,
  ip_hash       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (commentaire_id, liker_key)
);

CREATE INDEX IF NOT EXISTS idx_commentaire_likes_commentaire_id
  ON commentaire_likes(commentaire_id);

CREATE INDEX IF NOT EXISTS idx_commentaire_likes_article_id
  ON commentaire_likes(article_id)
  WHERE article_id IS NOT NULL;
