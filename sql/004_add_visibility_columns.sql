-- Migration: Add visibility columns to formation_modules and formation_lecons
-- Allows hiding/showing modules and lessons independently
-- Date: 2026-02-24

ALTER TABLE formation_modules 
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;

ALTER TABLE formation_lecons 
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE;

-- Create index for filtering visible items
CREATE INDEX idx_formation_modules_visible 
ON formation_modules(formation_id, is_visible);

CREATE INDEX idx_formation_lecons_visible 
ON formation_lecons(module_id, is_visible);

-- Update RLS policies if needed
-- When querying modules, check is_visible status
-- When querying lessons, check both module visibility and lesson visibility
