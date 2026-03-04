-- Ensure videos bucket supports long-form training uploads.
-- 5 GB default can be adjusted if your Supabase plan allows a higher limit.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  5368709120,
  ARRAY[
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-matroska',
    'video/x-msvideo',
    'video/mpeg',
    'video/mp2t'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
