-- Add thumbnail_url column to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN videos.thumbnail_url IS 'URL of the video thumbnail/cover image. Auto-generated from YouTube/Vimeo or extracted from uploaded videos';
