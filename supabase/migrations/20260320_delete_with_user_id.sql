-- ============================================
-- Update delete RPC to support user_id-based deletion
-- Logged-in users who own the cultivar can delete without edit key
-- ============================================

DROP FUNCTION IF EXISTS public.delete_with_edit_key_hash(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION public.delete_with_edit_key_hash(
  p_cultivar_id BIGINT,
  p_edit_key_hash TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_hash TEXT;
  v_stored_user_id UUID;
BEGIN
  SELECT edit_key_hash, user_id
    INTO v_stored_hash, v_stored_user_id
    FROM cultivars
   WHERE id = p_cultivar_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Allow delete if user_id matches (logged-in owner)
  IF p_user_id IS NOT NULL AND v_stored_user_id IS NOT NULL AND p_user_id = v_stored_user_id THEN
    NULL; -- Skip edit key check
  ELSIF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
  ELSIF p_edit_key_hash IS NULL OR p_edit_key_hash <> v_stored_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
  END IF;

  DELETE FROM cultivars WHERE id = p_cultivar_id;

  RETURN jsonb_build_object('success', true, 'id', p_cultivar_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_with_edit_key_hash(BIGINT, TEXT, UUID) TO anon, authenticated;
