-- Checkout/order workflow additions
-- Creates commande_items table (missing from baseline) and RLS policies.

CREATE TABLE IF NOT EXISTS commande_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commande_id UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
  produit_id UUID REFERENCES produits(id),
  formation_id UUID REFERENCES formations(id),
  video_id UUID REFERENCES videos(id),
  item_type TEXT NOT NULL CHECK (item_type IN ('produit', 'formation', 'video')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT commande_items_single_type CHECK (
    (item_type = 'produit' AND produit_id IS NOT NULL AND formation_id IS NULL AND video_id IS NULL) OR
    (item_type = 'formation' AND formation_id IS NOT NULL AND produit_id IS NULL AND video_id IS NULL) OR
    (item_type = 'video' AND video_id IS NOT NULL AND produit_id IS NULL AND formation_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_commande_items_commande_id ON commande_items (commande_id);
CREATE INDEX IF NOT EXISTS idx_commande_items_produit_id ON commande_items (produit_id);
CREATE INDEX IF NOT EXISTS idx_commande_items_formation_id ON commande_items (formation_id);
CREATE INDEX IF NOT EXISTS idx_commande_items_video_id ON commande_items (video_id);

ALTER TABLE IF EXISTS commande_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commande_items_select_own_or_admin ON commande_items;
DROP POLICY IF EXISTS commande_items_insert_own_or_admin ON commande_items;
DROP POLICY IF EXISTS commande_items_update_admin_only ON commande_items;
DROP POLICY IF EXISTS commande_items_delete_admin_only ON commande_items;

CREATE POLICY commande_items_select_own_or_admin ON commande_items FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM commandes c
      WHERE c.id = commande_items.commande_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY commande_items_insert_own_or_admin ON commande_items FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM commandes c
      WHERE c.id = commande_items.commande_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY commande_items_update_admin_only ON commande_items FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY commande_items_delete_admin_only ON commande_items FOR DELETE
  USING (is_admin());
