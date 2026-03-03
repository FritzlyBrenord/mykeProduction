-- Split workflow by order item:
-- - formations: explicit authorization by admin
-- - physical products: processing -> shipped -> delivered by admin
-- - digital items: delivered automatically after payment

ALTER TABLE IF EXISTS commande_items
  ADD COLUMN IF NOT EXISTS item_status TEXT NOT NULL DEFAULT 'paid'
    CHECK (item_status IN ('paid','processing','shipped','delivered','cancelled','refunded')),
  ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE commande_items ci
SET
  item_status = CASE
    WHEN c.status IN ('cancelled', 'refunded') THEN c.status
    WHEN ci.item_type = 'formation'
      AND EXISTS (
        SELECT 1
        FROM enrollments e
        WHERE e.user_id = c.user_id
          AND e.formation_id = ci.formation_id
      ) THEN 'delivered'
    WHEN ci.item_type = 'video' THEN 'delivered'
    WHEN ci.item_type = 'produit' AND COALESCE((
      SELECT p.is_digital
      FROM produits p
      WHERE p.id = ci.produit_id
      LIMIT 1
    ), FALSE) = TRUE THEN 'delivered'
    WHEN c.status IN ('processing', 'shipped', 'delivered') THEN c.status
    WHEN c.status = 'pending' THEN 'paid'
    ELSE 'paid'
  END,
  authorized_at = CASE
    WHEN ci.item_type = 'formation'
      AND EXISTS (
        SELECT 1
        FROM enrollments e
        WHERE e.user_id = c.user_id
          AND e.formation_id = ci.formation_id
      ) THEN COALESCE(ci.authorized_at, NOW())
    ELSE ci.authorized_at
  END,
  processing_at = CASE
    WHEN c.processing_at IS NOT NULL AND ci.item_type = 'produit'
      THEN COALESCE(ci.processing_at, c.processing_at)
    ELSE ci.processing_at
  END,
  shipped_at = CASE
    WHEN c.shipped_at IS NOT NULL AND ci.item_type = 'produit'
      THEN COALESCE(ci.shipped_at, c.shipped_at)
    ELSE ci.shipped_at
  END,
  delivered_at = CASE
    WHEN c.delivered_at IS NOT NULL THEN COALESCE(ci.delivered_at, c.delivered_at)
    WHEN ci.item_type = 'video' THEN COALESCE(ci.delivered_at, c.created_at, NOW())
    WHEN ci.item_type = 'produit' AND COALESCE((
      SELECT p.is_digital
      FROM produits p
      WHERE p.id = ci.produit_id
      LIMIT 1
    ), FALSE) = TRUE
      THEN COALESCE(ci.delivered_at, c.created_at, NOW())
    WHEN ci.item_type = 'formation'
      AND EXISTS (
        SELECT 1
        FROM enrollments e
        WHERE e.user_id = c.user_id
          AND e.formation_id = ci.formation_id
      ) THEN COALESCE(ci.delivered_at, NOW())
    ELSE ci.delivered_at
  END,
  cancelled_at = CASE
    WHEN c.cancelled_at IS NOT NULL AND c.status IN ('cancelled', 'refunded')
      THEN COALESCE(ci.cancelled_at, c.cancelled_at)
    ELSE ci.cancelled_at
  END,
  updated_at = NOW()
FROM commandes c
WHERE c.id = ci.commande_id;

CREATE INDEX IF NOT EXISTS idx_commande_items_item_status
  ON commande_items (item_status);

CREATE INDEX IF NOT EXISTS idx_commande_items_authorized_at
  ON commande_items (authorized_at DESC NULLS LAST);
