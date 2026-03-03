-- Add delivery tracking fields for commandes
-- Supports admin workflow: preparation -> shipped -> delivered
-- plus client-side tracking timeline and estimated delivery date.

ALTER TABLE IF EXISTS commandes
  ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_timeline JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_commandes_estimated_delivery_at
  ON commandes (estimated_delivery_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_commandes_tracking_status_created
  ON commandes (status, created_at DESC);
