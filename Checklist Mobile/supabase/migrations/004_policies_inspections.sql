-- Ensure RLS is enabled on inspections
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT their own rows
CREATE POLICY inspections_select_auth ON public.inspections
  FOR SELECT
  USING (user_id::text = auth.uid()::text);

-- Allow authenticated users to INSERT rows with their own user_id
CREATE POLICY inspections_insert_auth ON public.inspections
  FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

-- Optional: allow UPDATE on own rows (commented out)
-- CREATE POLICY inspections_update_auth ON public.inspections
--   FOR UPDATE
--   USING (user_id::text = auth.uid()::text)
--   WITH CHECK (user_id::text = auth.uid()::text);
