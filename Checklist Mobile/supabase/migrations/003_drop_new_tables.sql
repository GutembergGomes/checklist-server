-- Drop tables created by the new mobile schema
DROP TABLE IF EXISTS public.fotos CASCADE;
DROP TABLE IF EXISTS public.respostas_checklist CASCADE;
DROP TABLE IF EXISTS public.checklists CASCADE;
DROP TABLE IF EXISTS public.equipamentos CASCADE;
DROP TABLE IF EXISTS public.sync_log CASCADE;
DROP TABLE IF EXISTS public.sync_control CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- Drop helper function and triggers if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP FUNCTION public.update_updated_at_column() CASCADE;
  END IF;
END $$;
