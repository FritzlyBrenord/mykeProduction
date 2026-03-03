-- Publish existing draft products so they appear in the public boutique.
-- Run once in Supabase SQL editor.

UPDATE produits
SET status = 'published',
    updated_at = NOW()
WHERE status = 'draft'
  AND deleted_at IS NULL;

