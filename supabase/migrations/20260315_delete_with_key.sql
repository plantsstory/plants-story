-- ============================================
-- Delete with Edit Key RPC
-- Allows authenticated edit key holders to delete their cultivar
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_with_edit_key_hash(
  p_cultivar_name TEXT,
  p_edit_key_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_stored_hash TEXT;
BEGIN
  SELECT id, edit_key_hash
    INTO v_id, v_stored_hash
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
  END IF;

  IF p_edit_key_hash <> v_stored_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
  END IF;

  DELETE FROM cultivars WHERE id = v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_with_edit_key_hash(TEXT, TEXT) TO anon, authenticated;
