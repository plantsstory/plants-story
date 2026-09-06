-- Genus requests (owner decision 2026-09-06): the archive stays Anthurium-only;
-- visitors can ask for another genus, and genera are added when demand shows.
CREATE TABLE IF NOT EXISTS public.genus_requests (
  id BIGSERIAL PRIMARY KEY,
  genus TEXT NOT NULL,
  note TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS genus_requests_genus_idx ON public.genus_requests (genus, created_at DESC);

ALTER TABLE public.genus_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read genus_requests" ON public.genus_requests;
CREATE POLICY "Admin read genus_requests" ON public.genus_requests FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Admin delete genus_requests" ON public.genus_requests;
CREATE POLICY "Admin delete genus_requests" ON public.genus_requests FOR DELETE USING (public.is_admin());
REVOKE ALL ON public.genus_requests FROM anon, authenticated;
GRANT SELECT, DELETE ON public.genus_requests TO authenticated; -- RLS limits this to the admin

-- Anyone (signed in or not) may file a request; writes go through this function only.
CREATE OR REPLACE FUNCTION public.request_genus(p_genus TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  g TEXT; n TEXT; today_count INT; mine INT; total INT;
BEGIN
  g := regexp_replace(coalesce(p_genus, ''), '[^A-Za-z]', '', 'g');
  IF length(g) < 3 OR length(g) > 40 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_genus');
  END IF;
  g := upper(left(g, 1)) || lower(substr(g, 2));
  IF EXISTS (SELECT 1 FROM public.genera WHERE lower(name) = lower(g) AND is_visible) THEN
    RETURN json_build_object('success', false, 'error', 'already_visible');
  END IF;
  n := nullif(left(coalesce(p_note, ''), 300), '');
  SELECT count(*) INTO today_count FROM public.genus_requests WHERE created_at > now() - interval '1 day';
  IF today_count >= 100 THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;
  IF auth.uid() IS NOT NULL THEN
    SELECT count(*) INTO mine FROM public.genus_requests WHERE user_id = auth.uid() AND genus = g;
    IF mine >= 1 THEN
      RETURN json_build_object('success', false, 'error', 'duplicate');
    END IF;
  END IF;
  INSERT INTO public.genus_requests (genus, note, user_id) VALUES (g, n, auth.uid());
  SELECT count(*) INTO total FROM public.genus_requests WHERE genus = g;
  RETURN json_build_object('success', true, 'genus', g, 'count', total);
END $$;
GRANT EXECUTE ON FUNCTION public.request_genus(TEXT, TEXT) TO anon, authenticated;

-- Admin summary: demand per genus with the latest notes
CREATE OR REPLACE FUNCTION public.genus_request_summary()
RETURNS JSON LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_admin() THEN coalesce(json_agg(row_to_json(t) ORDER BY t.count DESC, t.last_at DESC), '[]'::json) ELSE '[]'::json END
  FROM (
    SELECT genus, count(*)::int AS count, max(created_at) AS last_at,
           count(user_id)::int AS signed_in,
           (SELECT json_agg(note) FROM (SELECT note FROM public.genus_requests r2 WHERE r2.genus = r.genus AND note IS NOT NULL ORDER BY created_at DESC LIMIT 5) x) AS notes
    FROM public.genus_requests r GROUP BY genus
  ) t;
$$;
GRANT EXECUTE ON FUNCTION public.genus_request_summary() TO authenticated;
