-- Add storage path for article cover images uploaded to Supabase Storage
-- Keeps backward compatibility with existing thumbnail_url usage.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path TEXT;

COMMENT ON COLUMN articles.thumbnail_storage_path IS
  'Storage object path for article cover image (bucket: images).';

CREATE INDEX IF NOT EXISTS idx_articles_thumbnail_storage_path
  ON articles(thumbnail_storage_path)
  WHERE thumbnail_storage_path IS NOT NULL;
