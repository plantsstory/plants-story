-- ============================================
-- Delete with Edit Key RPC (v2 - uses ID instead of name)
-- Allows authenticated edit key holders to delete their cultivar
-- ============================================

-- Drop old version (name-based)
DROP FUNCTION IF EXISTS public.delete_with_edit_key_hash(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.delete_with_edit_key_hash(
  p_cultivar_id BIGINT,
  p_edit_key_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
BEGIN
  SELECT edit_key_hash
    INTO v_stored_hash
    FROM cultivars
   WHERE id = p_cultivar_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
  END IF;

  IF p_edit_key_hash <> v_stored_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
  END IF;

  DELETE FROM cultivars WHERE id = p_cultivar_id;

  RETURN jsonb_build_object('success', true, 'id', p_cultivar_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_with_edit_key_hash(BIGINT, TEXT) TO anon, authenticated;
