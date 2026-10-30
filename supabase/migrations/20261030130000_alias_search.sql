-- Board 14 T186 (2026-10-30): the list search also looks in aliases (クリスタリナム finds crystallinum).
-- Built from the live definition (reference_live_db_differs); only the two p_search conditions change.
CREATE OR REPLACE FUNCTION public.get_cultivars_paginated(p_genus text, p_type_filter text DEFAULT 'all'::text, p_sort text DEFAULT 'name'::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0, p_cursor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND (p_type_filter IN ('all','seedling') OR (p_type_filter = 'cultivar' AND c.type IN ('clone','hybrid')) OR c.type = p_type_filter)
    AND (p_search IS NULL OR p_search = '' OR c.cultivar_name ILIKE '%' || p_search || '%' OR EXISTS (SELECT 1 FROM unnest(COALESCE(c.aliases, '{}'::text[])) AS al(name) WHERE al.name ILIKE '%' || p_search || '%'));

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
      AND (p_type_filter IN ('all','seedling') OR (p_type_filter = 'cultivar' AND c.type IN ('clone','hybrid')) OR c.type = p_type_filter)
      AND (p_search IS NULL OR p_search = '' OR c.cultivar_name ILIKE '%' || p_search || '%' OR EXISTS (SELECT 1 FROM unnest(COALESCE(c.aliases, '{}'::text[])) AS al(name) WHERE al.name ILIKE '%' || p_search || '%'))
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
$function$
;
