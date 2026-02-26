-- Création du bucket pour les documents électroniques
-- Cette migration crée l'infrastructure pour stocker les fichiers documents

-- Note: Le bucket doit être créé via l'interface Supabase ou via l'API
-- Cette migration documente la structure attendue

-- Structure:
-- - Bucket: "documents" (public ou privé selon les besoins)
-- - Chemin: /documents/{product_id}/{filename}

-- Important: Exécuter via Supabase dashboard:
-- 1. Aller à Storage > Buckets
-- 2. Créer un nouveau bucket nommé "documents"
-- 3. Configuration:
--    - Public (si accès public aux documents)
--    - Max file size: 100MB
--    - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc.

-- Politique RLS pour le bucket documents
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND (
    auth.role() = 'authenticated'
    OR auth.role() = 'anon'
  )
);

CREATE POLICY "Allow admins to upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "Allow admins to update documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "Allow admins to delete documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'admin'
);
