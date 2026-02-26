-- Myke Industrie SQL baseline extracted from myke_industrie_v3_final.docx
-- Generated automatically for Phase 0 scaffolding.
-- Date: 2026-02-24

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name               TEXT,
  avatar_url              TEXT,
  role                    TEXT NOT NULL DEFAULT 'client'
                            CHECK (role IN ('client', 'admin')),
  phone_encrypted         TEXT,        -- AES-256-GCM chiffré côté app
  country                 TEXT,
  bio                     TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  two_fa_enabled          BOOLEAN DEFAULT FALSE,
  two_fa_secret_encrypted TEXT,        -- Secret TOTP chiffré AES-256-GCM
  last_login_at           TIMESTAMPTZ,
  deleted_at              TIMESTAMPTZ, -- Soft delete RGPD
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE user_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,  -- Hash SHA-256 du token JWT
  ip_address         INET,
  user_agent         TEXT,
  device_name        TEXT,           -- 'iPhone 15', 'Chrome Windows'
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at       TIMESTAMPTZ DEFAULT NOW(),
  revoked_at         TIMESTAMPTZ,
  revoked_by         UUID REFERENCES profiles(id)
);

CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('formation','article','produit','video','global')),
  icon       TEXT,
  color      TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE formations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  description    TEXT,
  content        TEXT,            -- Pour format texte uniquement
  thumbnail_url  TEXT,
  price          NUMERIC(10,2) DEFAULT 0 CHECK (price >= 0),
  is_free        BOOLEAN DEFAULT FALSE,
  format         TEXT NOT NULL CHECK (format IN ('video','text')),
  status         TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  category_id    UUID REFERENCES categories(id),
  author_id      UUID REFERENCES profiles(id),
  duration_hours NUMERIC(5,1) CHECK (duration_hours >= 0),
  level          TEXT CHECK (level IN ('debutant','intermediaire','avance')),
  language       TEXT DEFAULT 'fr',
  certificate    BOOLEAN DEFAULT FALSE,
  enrolled_count INTEGER DEFAULT 0,
  rating_avg     NUMERIC(3,2) DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE formation_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  intro_type   TEXT CHECK (intro_type IN ('text','video')),
  intro_text   TEXT,
  intro_video_url  TEXT,
  intro_video_type TEXT CHECK (intro_video_type IN ('upload','youtube','vimeo')),
  order_index  INTEGER NOT NULL CHECK (order_index >= 0),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE formation_lecons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    UUID NOT NULL REFERENCES formation_modules(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  content      TEXT,
  video_url    TEXT,
  video_type   TEXT CHECK (video_type IN ('upload','youtube','vimeo')),
  duration_min INTEGER CHECK (duration_min >= 0),
  order_index  INTEGER NOT NULL CHECK (order_index >= 0),
  is_preview   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  formation_id UUID NOT NULL REFERENCES formations(id),
  enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  progress     INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  UNIQUE(user_id, formation_id)
);

CREATE TABLE lecon_progress (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id),
  lecon_id   UUID NOT NULL REFERENCES formation_lecons(id),
  completed  BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lecon_id)
);

CREATE TABLE lesson_resources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecon_id   UUID NOT NULL REFERENCES formation_lecons(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  file_type  TEXT CHECK (file_type IN ('pdf','zip','docx','xlsx','mp3','other')),
  file_size  INTEGER CHECK (file_size > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quizzes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id  UUID REFERENCES formations(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  passing_score INTEGER DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE quiz_questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question       TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('multiple_choice','true_false','open')),
  options        JSONB,  -- Pour multiple_choice
  correct_answer JSONB,
  points         INTEGER DEFAULT 1 CHECK (points > 0),
  order_index    INTEGER NOT NULL
);

CREATE TABLE quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  quiz_id      UUID NOT NULL REFERENCES quizzes(id),
  score        INTEGER CHECK (score BETWEEN 0 AND 100),
  passed       BOOLEAN,
  answers      JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE articles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  excerpt         TEXT,
  content         TEXT NOT NULL,  -- HTML sanitisé via DOMPurify
  thumbnail_url   TEXT,
  status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft','published','scheduled','archived')),
  category_id     UUID REFERENCES categories(id),
  author_id       UUID REFERENCES profiles(id),
  published_at    TIMESTAMPTZ,
  scheduled_at    TIMESTAMPTZ,    -- Publication programmée via Inngest
  seo_title       TEXT,
  seo_description TEXT,
  og_image        TEXT,
  view_count      INTEGER DEFAULT 0,
  reading_time    INTEGER,        -- En minutes
  allow_comments  BOOLEAN DEFAULT TRUE,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commentaires (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id),
  article_id   UUID REFERENCES articles(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  status       TEXT DEFAULT 'approved' CHECK (status IN ('approved','pending','rejected')),
  parent_id    UUID REFERENCES commentaires(id),  -- Réponses imbriquées
  likes        INTEGER DEFAULT 0,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE produits (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  description  TEXT,
  content      TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  images       TEXT[],
  type         TEXT NOT NULL CHECK (type IN ('chimique','document','autre')),
  stock        INTEGER,  -- NULL = illimité (numérique)
  is_digital   BOOLEAN DEFAULT FALSE,
  file_url     TEXT,
  -- Produits chimiques
  cas_number   TEXT,
  msds_url     TEXT,
  purity       TEXT,
  unit         TEXT CHECK (unit IN ('kg','g','mg','L','mL','unite','autre')),
  min_order    INTEGER DEFAULT 1 CHECK (min_order > 0),
  -- Classification GHS/CLP
  ghs_pictograms            TEXT[],  -- ['GHS01','GHS06']
  hazard_statements         TEXT[],  -- ['H225','H319']
  precautionary_statements  TEXT[],  -- ['P210','P233']
  signal_word               TEXT CHECK (signal_word IN ('Danger','Attention','Aucun')),
  age_restricted            BOOLEAN DEFAULT FALSE,
  restricted_sale           BOOLEAN DEFAULT FALSE,
  adr_class                 TEXT,
  -- Général
  status       TEXT DEFAULT 'published' CHECK (status IN ('published','draft','archived')),
  category_id  UUID REFERENCES categories(id),
  featured     BOOLEAN DEFAULT FALSE,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE chemical_inventory (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id       UUID NOT NULL REFERENCES produits(id),
  batch_number     TEXT NOT NULL,       -- Numéro de lot OBLIGATOIRE
  quantity_in      NUMERIC(10,3),       -- Entrée en stock
  quantity_out     NUMERIC(10,3),       -- Sortie (vente/perte)
  quantity_current NUMERIC(10,3),       -- Stock actuel
  purity_percent   NUMERIC(5,2),
  manufacturing_date DATE,
  expiry_date      DATE,
  storage_location TEXT,               -- 'Entrepôt A, Étagère 3, Case B'
  safety_class     TEXT,
  restricted       BOOLEAN DEFAULT FALSE,
  movement_type    TEXT CHECK (movement_type IN ('entree','vente','perte','retour','peremption')),
  order_id         UUID,
  user_id          UUID REFERENCES profiles(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id),
  session_id TEXT,  -- Pour visiteurs non connectés
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id      UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  produit_id   UUID REFERENCES produits(id),
  formation_id UUID REFERENCES formations(id),
  video_id     UUID,
  item_type    TEXT NOT NULL CHECK (item_type IN ('produit','formation','video')),
  quantity     INTEGER DEFAULT 1 CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  added_at     TIMESTAMPTZ DEFAULT NOW(),
  -- Contrainte polymorphisme : un seul type à la fois
  CONSTRAINT check_single_item_type CHECK (
    (item_type='produit'   AND produit_id IS NOT NULL   AND formation_id IS NULL AND video_id IS NULL) OR
    (item_type='formation' AND formation_id IS NOT NULL AND produit_id IS NULL   AND video_id IS NULL) OR
    (item_type='video'     AND video_id IS NOT NULL     AND produit_id IS NULL   AND formation_id IS NULL)
  )
);

CREATE TABLE wishlists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  produit_id   UUID REFERENCES produits(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES formations(id) ON DELETE CASCADE,
  video_id     UUID,
  item_type    TEXT NOT NULL CHECK (item_type IN ('produit','formation','video')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value   NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  valid_from       TIMESTAMPTZ,
  valid_until      TIMESTAMPTZ,
  usage_limit      INTEGER CHECK (usage_limit > 0),
  usage_count      INTEGER DEFAULT 0,
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commandes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES profiles(id),
  status           TEXT DEFAULT 'pending' CHECK (status IN
                     ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  subtotal         NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount  NUMERIC(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount       NUMERIC(10,2) DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount     NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  currency         TEXT DEFAULT 'USD',
  coupon_id        UUID REFERENCES coupons(id),
  shipping_address JSONB,  -- Chiffré AES-256 côté application
  payment_method   TEXT CHECK (payment_method IN ('stripe','paypal')),
  payment_id       TEXT,
  invoice_url      TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE video_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, description TEXT, thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE videos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
  video_url     TEXT, video_type TEXT NOT NULL CHECK (video_type IN ('upload','youtube','vimeo')),
  access_type   TEXT DEFAULT 'public' CHECK (access_type IN ('public','members','paid')),
  price         NUMERIC(10,2) DEFAULT 0 CHECK (price >= 0),
  status        TEXT DEFAULT 'published' CHECK (status IN ('published','draft','archived')),
  category_id   UUID REFERENCES categories(id), playlist_id UUID REFERENCES video_playlists(id),
  view_count    INTEGER DEFAULT 0, deleted_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES profiles(id),
  commande_id UUID REFERENCES commandes(id), amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  provider TEXT NOT NULL CHECK (provider IN ('stripe','paypal')),
  status TEXT CHECK (status IN ('pending','success','failed','refunded')),
  metadata JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL, country_name TEXT NOT NULL,
  rate_percent NUMERIC(5,2) NOT NULL CHECK (rate_percent >= 0),
  is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN
    ('create','update','delete','login','logout','payment','export','2fa_enable','2fa_disable','session_revoke')),
  table_name TEXT, record_id UUID, old_data JSONB, new_data JSONB,
  ip_address INET, user_agent TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);  -- JAMAIS de UPDATE/DELETE sur audit_logs

ALTER TABLE chemical_inventory
  ADD CONSTRAINT chemical_inventory_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES commandes(id);

ALTER TABLE cart_items
  ADD CONSTRAINT cart_items_video_id_fkey
  FOREIGN KEY (video_id) REFERENCES videos(id);

ALTER TABLE wishlists
  ADD CONSTRAINT wishlists_video_id_fkey
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_enrollments ON enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY admins_all_enrollments ON enrollments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

CREATE POLICY system_insert_enrollments ON enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_cart ON cart_items FOR ALL
  USING (EXISTS (SELECT 1 FROM carts WHERE id=cart_items.cart_id AND user_id=auth.uid()));

ALTER TABLE chemical_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY admins_only_inventory ON chemical_inventory FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY admins_read_logs ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id=auth.uid() AND role='admin'));

CREATE POLICY system_insert_logs ON audit_logs FOR INSERT WITH CHECK (TRUE);

