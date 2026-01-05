-- Add 'nivel' column to inspections and irrig_inspections for percentage aggregation
BEGIN;

ALTER TABLE IF EXISTS public.inspections
  ADD COLUMN IF NOT EXISTS nivel INTEGER NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.irrig_inspections
  ADD COLUMN IF NOT EXISTS nivel INTEGER NOT NULL DEFAULT 0;

COMMIT;
