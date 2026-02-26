-- Migration pour ajouter la planification de publication
-- Note: Les colonnes peuvent avoir été créées partiellement, on rectifie ici

-- Vérifier et créer les colonnes si elles n'existent pas
DO $$
BEGIN
  -- Ajouter scheduled_publish_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'formations' AND column_name = 'scheduled_publish_at'
  ) THEN
    ALTER TABLE formations ADD COLUMN scheduled_publish_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Ajouter scheduled_timezone si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'formations' AND column_name = 'scheduled_timezone'
  ) THEN
    ALTER TABLE formations ADD COLUMN scheduled_timezone VARCHAR(255) DEFAULT 'UTC';
  END IF;
  
  -- Ajouter published_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'formations' AND column_name = 'published_at'
  ) THEN
    ALTER TABLE formations ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
  END IF;
END
$$;

-- Modifier la contrainte du statut pour inclure 'scheduled'
-- D'abord, supprimer l'ancienne contrainte si elle existe
ALTER TABLE formations DROP CONSTRAINT IF EXISTS formations_status_check;

-- Ajouter la nouvelle contrainte avec le statut 'scheduled'
ALTER TABLE formations 
ADD CONSTRAINT formations_status_check 
CHECK (status IN ('draft', 'published', 'archived', 'scheduled'));

-- Créer l'index si possible (ignore si déjà existe)
CREATE INDEX IF NOT EXISTS idx_formations_scheduled ON formations(scheduled_publish_at, status) 
WHERE scheduled_publish_at IS NOT NULL AND status = 'scheduled';

-- Ajouter les commentaires
COMMENT ON COLUMN formations.scheduled_publish_at IS 'Date et heure de publication automatique planifiée';
COMMENT ON COLUMN formations.scheduled_timezone IS 'Fuseau horaire pour la publication (ex: Europe/Paris, America/New_York)';
COMMENT ON COLUMN formations.published_at IS 'Date et heure réelle de publication';
