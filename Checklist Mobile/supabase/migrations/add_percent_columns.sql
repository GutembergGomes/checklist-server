-- Add percent and percentage columns to inspections tables for listing display
BEGIN;

ALTER TABLE IF EXISTS public.inspections
  ADD COLUMN IF NOT EXISTS percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentage TEXT NOT NULL DEFAULT '0%';

ALTER TABLE IF EXISTS public.irrig_inspections
  ADD COLUMN IF NOT EXISTS percent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentage TEXT NOT NULL DEFAULT '0%';

COMMIT;
