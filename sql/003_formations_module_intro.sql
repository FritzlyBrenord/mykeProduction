-- Ajoute l'introduction optionnelle par module (texte ou video).
ALTER TABLE formation_modules
  ADD COLUMN IF NOT EXISTS intro_type TEXT CHECK (intro_type IN ('text','video')),
  ADD COLUMN IF NOT EXISTS intro_text TEXT,
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT,
  ADD COLUMN IF NOT EXISTS intro_video_type TEXT CHECK (intro_video_type IN ('upload','youtube','vimeo'));
