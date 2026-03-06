-- Shipping settings table to handle dynamic delivery fees.
-- Rules:
-- 1. Delivery fees apply only to physical products (is_digital = false).
-- 2. Digital items (formations, videos, digital products) have 0 delivery fee.
-- 3. Fees can be global ('default') or country-specific.
-- 4. Free shipping is applied if the physical product subtotal >= free_threshold.
-- 5. Lower priority value = higher priority. New rules are appended at the end.

CREATE TABLE IF NOT EXISTS shipping_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL DEFAULT 'default',
  country_name TEXT NOT NULL DEFAULT 'Global / Default',
  base_fee NUMERIC NOT NULL DEFAULT 0,
  free_threshold NUMERIC NOT NULL DEFAULT 100,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code)
);

ALTER TABLE shipping_settings
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 100;

ALTER TABLE shipping_settings
  ALTER COLUMN country_code SET DEFAULT 'default';

ALTER TABLE shipping_settings
  ALTER COLUMN country_name SET DEFAULT 'Global / Default';

ALTER TABLE shipping_settings
  ALTER COLUMN base_fee SET DEFAULT 0;

ALTER TABLE shipping_settings
  ALTER COLUMN free_threshold SET DEFAULT 100;

ALTER TABLE shipping_settings
  ALTER COLUMN is_active SET DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipping_settings_priority_check'
  ) THEN
    ALTER TABLE shipping_settings
      ADD CONSTRAINT shipping_settings_priority_check CHECK (priority >= 1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipping_settings_base_fee_check'
  ) THEN
    ALTER TABLE shipping_settings
      ADD CONSTRAINT shipping_settings_base_fee_check CHECK (base_fee >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shipping_settings_free_threshold_check'
  ) THEN
    ALTER TABLE shipping_settings
      ADD CONSTRAINT shipping_settings_free_threshold_check CHECK (free_threshold >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS shipping_settings_active_priority_idx
  ON shipping_settings (is_active, priority, created_at);

ALTER TABLE shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_settings_public_read ON shipping_settings;
CREATE POLICY shipping_settings_public_read ON shipping_settings FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS shipping_settings_admin_all ON shipping_settings;
CREATE POLICY shipping_settings_admin_all ON shipping_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

INSERT INTO shipping_settings (country_code, country_name, base_fee, free_threshold, priority)
VALUES ('default', 'Global / Par defaut', 10, 100, 9999)
ON CONFLICT (country_code) DO UPDATE
SET
  country_name = EXCLUDED.country_name,
  priority = EXCLUDED.priority,
  is_active = true;
