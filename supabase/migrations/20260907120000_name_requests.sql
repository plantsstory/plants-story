-- Board 2026-09-07 (content B): a search with no result can ask for that NAME to be recorded.
-- Reuses genus_requests with a kind column; no login needed; the admin summary groups by kind.
ALTER TABLE public.genus_requests ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'genus';
CREATE INDEX IF NOT EXISTS genus_requests_kind_idx ON public.genus_requests (kind, genus);

CREATE OR REPLACE FUNCTION public.request_name(p_name TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n TEXT; today_count INT; total INT;
BEGIN
  n := regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g');
  n := btrim(n);
  IF length(n) < 3 OR length(n) > 80 OR n !~ '^[A-Za-z0-9''"×x .\-぀-ヿ一-鿿ー]+$' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_name');
  END IF;
  SELECT count(*) INTO today_count FROM public.genus_requests WHERE created_at > now() - interval '1 day';
  IF today_count >= 200 THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;
  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.genus_requests WHERE user_id = auth.uid() AND kind = 'name' AND lower(genus) = lower(n)) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate');
  END IF;
  INSERT INTO public.genus_requests (genus, note, user_id, kind) VALUES (n, nullif(left(coalesce(p_note, ''), 300), ''), auth.uid(), 'name');
  SELECT count(*) INTO total FROM public.genus_requests WHERE kind = 'name' AND lower(genus) = lower(n);
  RETURN json_build_object('success', true, 'name', n, 'count', total);
END $$;
GRANT EXECUTE ON FUNCTION public.request_name(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.genus_request_summary()
RETURNS JSON LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_admin() THEN coalesce(json_agg(row_to_json(t) ORDER BY t.kind, t.count DESC, t.last_at DESC), '[]'::json) ELSE '[]'::json END
  FROM (
    SELECT kind, genus, count(*)::int AS count, max(created_at) AS last_at,
           count(user_id)::int AS signed_in,
           (SELECT json_agg(note) FROM (SELECT note FROM public.genus_requests r2 WHERE r2.genus = r.genus AND r2.kind = r.kind AND note IS NOT NULL ORDER BY created_at DESC LIMIT 5) x) AS notes
    FROM public.genus_requests r GROUP BY kind, genus
  ) t;
$$;
