-- Individuals (owner decision 2026-09-07): a numbered or named single plant of a species
-- ('HR1', 'Dark Star') is a clone tagged 'individual' and linked to its species through
-- selected_from_id. It is listed on the species page, not in the genus list or counts.

-- 1. insert RPC: optional p_meta carries the Phase A columns (selected_from_id, tags, parents, ...)
DROP FUNCTION IF EXISTS public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_ai_status TEXT DEFAULT 'pending',
  p_created_ip TEXT DEFAULT NULL,
  p_is_private BOOLEAN DEFAULT false,
  p_meta JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
  v_sel BIGINT := NULLIF(p_meta->>'selected_from_id', '')::BIGINT;
  v_tags TEXT[] := CASE WHEN p_meta ? 'tags' AND jsonb_typeof(p_meta->'tags') = 'array'
                        THEN ARRAY(SELECT jsonb_array_elements_text(p_meta->'tags')) ELSE NULL END;
  v_aliases TEXT[] := CASE WHEN p_meta ? 'aliases' AND jsonb_typeof(p_meta->'aliases') = 'array'
                           THEN ARRAY(SELECT jsonb_array_elements_text(p_meta->'aliases')) ELSE NULL END;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_type = 'seedling' AND NOT public.can_post_seedling() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Seedling quota exceeded');
  END IF;

  -- An individual must hang off a species record of the same genus
  IF v_sel IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cultivars s WHERE s.id = v_sel AND s.type = 'species' AND s.genus = p_genus) THEN
    RETURN jsonb_build_object('success', false, 'error', 'selected_from_id must be a species of the same genus');
  END IF;

  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash, created_ip, user_id, is_private,
                         selected_from_id, tags, aliases, name_status, species_qualifier, locality,
                         parent_a_id, parent_b_id, parent_a_text, parent_b_text, formula_status)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, NULL, p_created_ip, auth.uid(),
          COALESCE(p_is_private, false) AND p_type = 'seedling',
          v_sel, v_tags, v_aliases,
          NULLIF(p_meta->>'name_status', ''), NULLIF(p_meta->>'species_qualifier', ''), NULLIF(p_meta->>'locality', ''),
          NULLIF(p_meta->>'parent_a_id', '')::BIGINT, NULLIF(p_meta->>'parent_b_id', '')::BIGINT,
          NULLIF(p_meta->>'parent_a_text', ''), NULLIF(p_meta->>'parent_b_text', ''), NULLIF(p_meta->>'formula_status', ''))
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id, 'is_private', v_row.is_private);
END;
$$;
GRANT EXECUTE ON FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, JSONB) TO authenticated;
ALTER FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, JSONB) SET statement_timeout = '10s';

-- 2. genus list: individuals are folded under their species
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
    AND NOT ('individual' = ANY(COALESCE(c.tags, '{}'::text[])))
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
      AND NOT ('individual' = ANY(COALESCE(c.tags, '{}'::text[])))
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

-- 3. genus counts: individuals are not counted as cultivars
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
    WHERE (is_private = false OR (auth.uid() IS NOT NULL AND user_id = auth.uid()))
      AND NOT ('individual' = ANY(COALESCE(tags, '{}'::text[])))
    GROUP BY genus
  ) sub
$$;
