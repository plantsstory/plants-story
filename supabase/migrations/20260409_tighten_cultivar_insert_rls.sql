-- Tighten cultivars INSERT RLS: require authentication
-- Previously "Public insert" allowed WITH CHECK (true) for anonymous users.
-- Since 20260407_remove_edit_key.sql enforces auth in RPC functions,
-- this migration tightens the RLS policy to match.

DROP POLICY IF EXISTS "Public insert" ON public.cultivars;

CREATE POLICY "Authenticated insert" ON public.cultivars
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also add CHECK constraints for data integrity
ALTER TABLE public.cultivars
  ADD CONSTRAINT cultivars_genus_not_empty CHECK (genus IS NOT NULL AND length(genus) > 0),
  ADD CONSTRAINT cultivars_name_not_empty CHECK (cultivar_name IS NOT NULL AND length(cultivar_name) > 0),
  ADD CONSTRAINT cultivars_name_max_length CHECK (length(cultivar_name) <= 255),
  ADD CONSTRAINT cultivars_type_valid CHECK (type IS NULL OR type IN ('species', 'hybrid', 'clone', 'seedling'));
