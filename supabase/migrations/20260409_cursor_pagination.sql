-- ============================================
-- Cursor-based pagination for genus pages
-- Adds p_cursor param for keyset pagination on name sort
-- Falls back to OFFSET for other sorts or page jumps
-- ============================================

-- Drop old signature to avoid overload conflicts
DROP FUNCTION IF EXISTS public.get_cultivars_paginated(TEXT, TEXT, TEXT, TEXT, INT, INT);

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
BEGIN
  v_is_seedling := (p_type_filter = 'seedling');

  -- Count total matching
  SELECT count(*) INTO v_total
  FROM cultivars c
  WHERE c.genus = p_genus
    AND (CASE WHEN v_is_seedling THEN c.type = 'seedling' ELSE c.type != 'seedling' END)
    AND (p_type_filter IN ('all','seedling') OR c.type = p_type_filter)
    AND (p_search IS NULL OR p_search = '' OR c.cultivar_name ILIKE '%' || p_search || '%');

  -- Paginated query with optional cursor
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sub.id,
      'cultivar_name', sub.cultivar_name,
      'genus', sub.genus,
      'type', sub.type,
      'origins', sub.origins,
      'user_id', sub.user_id,
      'created_at', sub.created_at,
      'ai_status', sub.ai_status
    )
  ) INTO v_result
  FROM (
    SELECT c.id, c.cultivar_name, c.genus, c.type,
           COALESCE(c.origins, '[]'::jsonb) AS origins,
           c.user_id, c.created_at, c.ai_status
    FROM cultivars c
    WHERE c.genus = p_genus
      AND (CASE WHEN v_is_seedling THEN c.type = 'seedling' ELSE c.type != 'seedling' END)
      AND (p_type_filter IN ('all','seedling') OR c.type = p_type_filter)
      AND (p_search IS NULL OR p_search = '' OR c.cultivar_name ILIKE '%' || p_search || '%')
      -- Cursor-based keyset condition (only for name sort)
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
    -- Use OFFSET only when cursor is not applicable
    OFFSET CASE WHEN p_cursor IS NOT NULL AND p_sort = 'name' THEN 0 ELSE p_offset END
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'items', COALESCE(v_result, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_cultivars_paginated(TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT) TO anon, authenticated;
