-- Phase 0: RLS baseline for all core tables.
-- Run this after 001_myke_industrie_v3.sql.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', FALSE)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin', FALSE);
$$;

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS formation_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS formation_lecons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lecon_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commentaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chemical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS video_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own_or_admin ON profiles;
DROP POLICY IF EXISTS profiles_insert_own_or_admin ON profiles;
DROP POLICY IF EXISTS profiles_update_own_or_admin ON profiles;
CREATE POLICY profiles_select_own_or_admin ON profiles FOR SELECT
  USING (auth.uid() = id OR is_admin());
CREATE POLICY profiles_insert_own_or_admin ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR is_admin());
CREATE POLICY profiles_update_own_or_admin ON profiles FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS user_sessions_select_own_or_admin ON user_sessions;
DROP POLICY IF EXISTS user_sessions_insert_own_or_admin ON user_sessions;
DROP POLICY IF EXISTS user_sessions_update_own_or_admin ON user_sessions;
DROP POLICY IF EXISTS user_sessions_delete_own_or_admin ON user_sessions;
CREATE POLICY user_sessions_select_own_or_admin ON user_sessions FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY user_sessions_insert_own_or_admin ON user_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY user_sessions_update_own_or_admin ON user_sessions FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY user_sessions_delete_own_or_admin ON user_sessions FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS categories_public_read ON categories;
DROP POLICY IF EXISTS categories_admin_write ON categories;
CREATE POLICY categories_public_read ON categories FOR SELECT
  USING (TRUE);
CREATE POLICY categories_admin_write ON categories FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS formations_public_or_enrolled_or_admin ON formations;
DROP POLICY IF EXISTS formations_admin_write ON formations;
CREATE POLICY formations_public_or_enrolled_or_admin ON formations FOR SELECT
  USING (
    status = 'published'
    OR EXISTS (
      SELECT 1
      FROM enrollments e
      WHERE e.formation_id = formations.id
        AND e.user_id = auth.uid()
    )
    OR is_admin()
  );
CREATE POLICY formations_admin_write ON formations FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS modules_public_or_enrolled_or_admin ON formation_modules;
DROP POLICY IF EXISTS modules_admin_write ON formation_modules;
CREATE POLICY modules_public_or_enrolled_or_admin ON formation_modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM formations f
      LEFT JOIN enrollments e
        ON e.formation_id = f.id
       AND e.user_id = auth.uid()
      WHERE f.id = formation_modules.formation_id
        AND (f.status = 'published' OR e.id IS NOT NULL OR is_admin())
    )
  );
CREATE POLICY modules_admin_write ON formation_modules FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS lecons_public_or_enrolled_or_admin ON formation_lecons;
DROP POLICY IF EXISTS lecons_admin_write ON formation_lecons;
CREATE POLICY lecons_public_or_enrolled_or_admin ON formation_lecons FOR SELECT
  USING (
    is_preview = TRUE
    OR EXISTS (
      SELECT 1
      FROM formation_modules fm
      JOIN formations f ON f.id = fm.formation_id
      LEFT JOIN enrollments e
        ON e.formation_id = f.id
       AND e.user_id = auth.uid()
      WHERE fm.id = formation_lecons.module_id
        AND (f.status = 'published' OR e.id IS NOT NULL OR is_admin())
    )
  );
CREATE POLICY lecons_admin_write ON formation_lecons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS users_own_enrollments ON enrollments;
DROP POLICY IF EXISTS admins_all_enrollments ON enrollments;
DROP POLICY IF EXISTS system_insert_enrollments ON enrollments;
DROP POLICY IF EXISTS enrollments_update_own_or_admin ON enrollments;
CREATE POLICY users_own_enrollments ON enrollments FOR SELECT
  USING (auth.uid() = user_id OR is_admin());
CREATE POLICY system_insert_enrollments ON enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());
CREATE POLICY enrollments_update_own_or_admin ON enrollments FOR UPDATE
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS lecon_progress_own_or_admin ON lecon_progress;
CREATE POLICY lecon_progress_own_or_admin ON lecon_progress FOR ALL
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS resources_public_or_enrolled_or_admin ON lesson_resources;
DROP POLICY IF EXISTS resources_admin_write ON lesson_resources;
CREATE POLICY resources_public_or_enrolled_or_admin ON lesson_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM formation_lecons fl
      JOIN formation_modules fm ON fm.id = fl.module_id
      JOIN formations f ON f.id = fm.formation_id
      LEFT JOIN enrollments e
        ON e.formation_id = f.id
       AND e.user_id = auth.uid()
      WHERE fl.id = lesson_resources.lecon_id
        AND (fl.is_preview = TRUE OR f.status = 'published' OR e.id IS NOT NULL OR is_admin())
    )
  );
CREATE POLICY resources_admin_write ON lesson_resources FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS quizzes_public_or_enrolled_or_admin ON quizzes;
DROP POLICY IF EXISTS quizzes_admin_write ON quizzes;
CREATE POLICY quizzes_public_or_enrolled_or_admin ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM formations f
      LEFT JOIN enrollments e
        ON e.formation_id = f.id
       AND e.user_id = auth.uid()
      WHERE f.id = quizzes.formation_id
        AND (f.status = 'published' OR e.id IS NOT NULL OR is_admin())
    )
    OR is_admin()
  );
CREATE POLICY quizzes_admin_write ON quizzes FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS quiz_questions_public_or_enrolled_or_admin ON quiz_questions;
DROP POLICY IF EXISTS quiz_questions_admin_write ON quiz_questions;
CREATE POLICY quiz_questions_public_or_enrolled_or_admin ON quiz_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM quizzes q
      JOIN formations f ON f.id = q.formation_id
      LEFT JOIN enrollments e
        ON e.formation_id = f.id
       AND e.user_id = auth.uid()
      WHERE q.id = quiz_questions.quiz_id
        AND (f.status = 'published' OR e.id IS NOT NULL OR is_admin())
    )
    OR is_admin()
  );
CREATE POLICY quiz_questions_admin_write ON quiz_questions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS quiz_attempts_own_or_admin ON quiz_attempts;
CREATE POLICY quiz_attempts_own_or_admin ON quiz_attempts FOR ALL
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS articles_public_or_admin ON articles;
DROP POLICY IF EXISTS articles_admin_write ON articles;
CREATE POLICY articles_public_or_admin ON articles FOR SELECT
  USING (status = 'published' OR is_admin());
CREATE POLICY articles_admin_write ON articles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS commentaires_read_public_or_owner_or_admin ON commentaires;
DROP POLICY IF EXISTS commentaires_insert_owner_or_admin ON commentaires;
DROP POLICY IF EXISTS commentaires_update_owner_or_admin ON commentaires;
DROP POLICY IF EXISTS commentaires_delete_owner_or_admin ON commentaires;
CREATE POLICY commentaires_read_public_or_owner_or_admin ON commentaires FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR is_admin());
CREATE POLICY commentaires_insert_owner_or_admin ON commentaires FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY commentaires_update_owner_or_admin ON commentaires FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY commentaires_delete_owner_or_admin ON commentaires FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS produits_public_or_admin ON produits;
DROP POLICY IF EXISTS produits_admin_write ON produits;
CREATE POLICY produits_public_or_admin ON produits FOR SELECT
  USING (status = 'published' OR is_admin());
CREATE POLICY produits_admin_write ON produits FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS admins_only_inventory ON chemical_inventory;
DROP POLICY IF EXISTS chemical_inventory_admin_only ON chemical_inventory;
CREATE POLICY chemical_inventory_admin_only ON chemical_inventory FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS carts_own_or_admin ON carts;
DROP POLICY IF EXISTS carts_insert_own_or_admin ON carts;
DROP POLICY IF EXISTS carts_update_own_or_admin ON carts;
DROP POLICY IF EXISTS carts_delete_own_or_admin ON carts;
CREATE POLICY carts_own_or_admin ON carts FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY carts_insert_own_or_admin ON carts FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY carts_update_own_or_admin ON carts FOR UPDATE
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY carts_delete_own_or_admin ON carts FOR DELETE
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS users_own_cart ON cart_items;
DROP POLICY IF EXISTS cart_items_own_or_admin ON cart_items;
CREATE POLICY cart_items_own_or_admin ON cart_items FOR ALL
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM carts c
      WHERE c.id = cart_items.cart_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1
      FROM carts c
      WHERE c.id = cart_items.cart_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS wishlists_own_or_admin ON wishlists;
CREATE POLICY wishlists_own_or_admin ON wishlists FOR ALL
  USING (user_id = auth.uid() OR is_admin())
  WITH CHECK (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS coupons_public_active_or_admin ON coupons;
DROP POLICY IF EXISTS coupons_admin_write ON coupons;
CREATE POLICY coupons_public_active_or_admin ON coupons FOR SELECT
  USING (is_active = TRUE OR is_admin());
CREATE POLICY coupons_admin_write ON coupons FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS commandes_select_own_or_admin ON commandes;
DROP POLICY IF EXISTS commandes_insert_own_or_admin ON commandes;
DROP POLICY IF EXISTS commandes_update_admin_only ON commandes;
DROP POLICY IF EXISTS commandes_delete_admin_only ON commandes;
CREATE POLICY commandes_select_own_or_admin ON commandes FOR SELECT
  USING (user_id = auth.uid() OR is_admin());
CREATE POLICY commandes_insert_own_or_admin ON commandes FOR INSERT
  WITH CHECK (user_id = auth.uid() OR is_admin());
CREATE POLICY commandes_update_admin_only ON commandes FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
CREATE POLICY commandes_delete_admin_only ON commandes FOR DELETE
  USING (is_admin());

DROP POLICY IF EXISTS playlists_public_or_admin ON video_playlists;
DROP POLICY IF EXISTS playlists_admin_write ON video_playlists;
CREATE POLICY playlists_public_or_admin ON video_playlists FOR SELECT
  USING (TRUE);
CREATE POLICY playlists_admin_write ON video_playlists FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS videos_public_or_admin ON videos;
DROP POLICY IF EXISTS videos_admin_write ON videos;
CREATE POLICY videos_public_or_admin ON videos FOR SELECT
  USING (status = 'published' OR is_admin());
CREATE POLICY videos_admin_write ON videos FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS paiements_admin_read ON paiements;
DROP POLICY IF EXISTS paiements_system_insert ON paiements;
CREATE POLICY paiements_admin_read ON paiements FOR SELECT
  USING (is_admin());
CREATE POLICY paiements_system_insert ON paiements FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS tax_rates_active_or_admin ON tax_rates;
DROP POLICY IF EXISTS tax_rates_admin_write ON tax_rates;
CREATE POLICY tax_rates_active_or_admin ON tax_rates FOR SELECT
  USING (is_active = TRUE OR is_admin());
CREATE POLICY tax_rates_admin_write ON tax_rates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS admins_read_logs ON audit_logs;
DROP POLICY IF EXISTS system_insert_logs ON audit_logs;
DROP POLICY IF EXISTS audit_logs_admin_read ON audit_logs;
DROP POLICY IF EXISTS audit_logs_system_insert ON audit_logs;
CREATE POLICY audit_logs_admin_read ON audit_logs FOR SELECT
  USING (is_admin());
CREATE POLICY audit_logs_system_insert ON audit_logs FOR INSERT
  WITH CHECK (TRUE);
