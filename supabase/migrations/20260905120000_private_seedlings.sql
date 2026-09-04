-- Private seedling records (owner request 2026-09-05):
-- "実生の投稿は非公開を作りたい。非公開で自分だけの記録を取りたい人もいる"
-- A private record is visible only to its owner (and admins). It never appears
-- in listings, search, the sitemap, static pages or OGP.

ALTER TABLE public.cultivars
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cultivars.is_private IS
  'Owner-only record. Excluded from every public listing; seedlings only.';

CREATE INDEX IF NOT EXISTS cultivars_private_owner_idx
  ON public.cultivars (user_id) WHERE is_private;

-- ---------- RLS: hide private rows from everyone but the owner ----------
DROP POLICY IF EXISTS "Public read" ON public.cultivars;
CREATE POLICY "Public read" ON public.cultivars
  FOR SELECT
  USING (
    is_private = false
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

-- Only seedlings may be private (other types are the shared archive)
CREATE OR REPLACE FUNCTION public.cultivars_private_guard() RETURNS trigger AS $$
BEGIN
  IF NEW.is_private AND NEW.type <> 'seedling' THEN
    NEW.is_private := false;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS cultivars_private_guard_trg ON public.cultivars;
CREATE TRIGGER cultivars_private_guard_trg BEFORE INSERT OR UPDATE ON public.cultivars
  FOR EACH ROW EXECUTE FUNCTION public.cultivars_private_guard();

-- ---------- SECURITY DEFINER functions bypass RLS: filter explicitly ----------
CREATE OR REPLACE FUNCTION public.get_genus_counts()
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '5s'
AS $$
  SELECT COALESCE(jsonb_object_agg(genus, cnt), '{}'::jsonb)
  FROM (
    SELECT genus, count(*)::int AS cnt
    FROM cultivars
    WHERE is_private = false OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    GROUP BY genus
  ) sub
$$;

CREATE OR REPLACE FUNCTION public.get_cultivars_paginated(
  p_genus TEXT,
  p_type_filter TEXT DEFAULT 'all',
  p_sort TEXT DEFAULT 'name',
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_cursor TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total INT;
  v_is_seedling BOOLEAN;
  v_uid UUID := auth.uid();
BEGIN
  v_is_seedling := (p_type_filter = 'seedling');

  SELECT count(*) INTO v_total
  FROM cultivars c
  WHERE c.genus = p_genus
    AND (c.is_private = false OR (v_uid IS NOT NULL AND c.user_id = v_uid))
    AND (CASE WHEN v_is_seedling THEN c.type = 'seedling' ELSE c.type != 'seedling' END)
    AND (p_type_filter IN ('all','seedling') OR c.type = p_type_filter)
    AND (p_search IS NULL OR p_search = '' OR c.cultivar_name ILIKE '%' || p_search || '%');

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sub.id,
      'cultivar_name', sub.cultivar_name,
      'genus', sub.genus,
      'type', sub.type,
      'origins', sub.origins,
      'user_id', sub.user_id,
      'created_at', sub.created_at,
      'ai_status', sub.ai_status,
      'is_private', sub.is_private
    )
  ) INTO v_result
  FROM (
    SELECT c.id, c.cultivar_name, c.genus, c.type,
           COALESCE(c.origins, '[]'::jsonb) AS origins,
           c.user_id, c.created_at, c.ai_status, c.is_private
    FROM cultivars c
    WHERE c.genus = p_genus
      AND (c.is_private = false OR (v_uid IS NOT NULL AND c.user_id = v_uid))
      AND (CASE WHEN v_is_seedling THEN c.type = 'seedling' ELSE c.type != 'seedling' END)
      AND (p_type_filter IN ('all','seedling') OR c.type = p_type_filter)
      AND (p_search IS NULL OR p_search = '' OR c.cultivar_name ILIKE '%' || p_search || '%')
      AND (
        p_cursor IS NULL
        OR p_sort != 'name'
        OR lower(c.cultivar_name) > lower(p_cursor)
      )
    ORDER BY
      CASE WHEN p_sort = 'name' THEN lower(c.cultivar_name) END ASC,
      CASE WHEN p_sort = 'trust' THEN COALESCE((c.origins->0->>'trust')::int, 0) END DESC,
      CASE WHEN p_sort = 'newest' THEN c.created_at END DESC NULLS LAST
    LIMIT p_limit
    OFFSET CASE WHEN p_cursor IS NOT NULL AND p_sort = 'name' THEN 0 ELSE p_offset END
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'items', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_seedling_detail(p_cultivar_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
  v_is_owner BOOLEAN;
BEGIN
  SELECT * INTO v_row FROM cultivars WHERE id = p_cultivar_id AND type = 'seedling';
  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  v_is_owner := (auth.uid() IS NOT NULL AND v_row.user_id = auth.uid());

  IF v_row.is_private AND NOT v_is_owner AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'full_access', true,
    'can_edit', v_is_owner OR public.is_admin(),
    'can_delete', v_is_owner OR public.is_admin(),
    'data', row_to_json(v_row)::jsonb
  );
END;
$$;

-- Insert RPC gains the private flag (default false keeps existing callers working)
CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_ai_status TEXT DEFAULT 'pending',
  p_created_ip TEXT DEFAULT NULL,
  p_is_private BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_type = 'seedling' AND NOT public.can_post_seedling() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seedling quota exceeded');
  END IF;

  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash, created_ip, user_id, is_private)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, NULL, p_created_ip, auth.uid(),
          COALESCE(p_is_private, false) AND p_type = 'seedling')
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id, 'is_private', v_row.is_private);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Owner toggles the flag on an existing record
CREATE OR REPLACE FUNCTION public.set_cultivar_private(p_cultivar_id BIGINT, p_private BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  SELECT * INTO v_row FROM cultivars WHERE id = p_cultivar_id;
  IF v_row IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not found');
  END IF;
  IF v_row.user_id IS DISTINCT FROM auth.uid() AND NOT public.is_admin() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not the owner');
  END IF;
  IF v_row.type <> 'seedling' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only seedlings can be private');
  END IF;
  UPDATE cultivars SET is_private = COALESCE(p_private, false), updated_at = now()
  WHERE id = p_cultivar_id;
  RETURN jsonb_build_object('success', true, 'is_private', COALESCE(p_private, false));
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_cultivar_private(BIGINT, BOOLEAN) TO authenticated;

-- Private records must not count against nothing else: quota still counts them
-- (they use the same storage and AI budget), which is intentional.
