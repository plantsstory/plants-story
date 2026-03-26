-- ============================================
-- Google Auth Migration
-- Adds user_id to cultivars for login-based editing
-- Updates RPCs to support user_id-based edit without edit key
-- ============================================

-- 1. Add user_id column
ALTER TABLE public.cultivars
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2. Recreate insert_with_edit_key_hash with user_id parameter
DROP FUNCTION IF EXISTS public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_edit_key_hash TEXT DEFAULT NULL,
  p_ai_status TEXT DEFAULT 'pending',
  p_created_ip TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row cultivars%ROWTYPE;
BEGIN
  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash, created_ip, user_id)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, p_edit_key_hash, p_created_ip, p_user_id)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, UUID) TO anon, authenticated;

-- 3. Recreate update_with_edit_key_hash with user_id support
DROP FUNCTION IF EXISTS public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.update_with_edit_key_hash(
  p_cultivar_name TEXT,
  p_edit_key_hash TEXT DEFAULT NULL,
  p_new_cultivar_name TEXT DEFAULT NULL,
  p_new_genus TEXT DEFAULT NULL,
  p_new_type TEXT DEFAULT NULL,
  p_origins JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_stored_hash TEXT;
  v_stored_user_id UUID;
BEGIN
  SELECT id, edit_key_hash, user_id
    INTO v_id, v_stored_hash, v_stored_user_id
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Allow edit if: (1) user_id matches, OR (2) edit_key_hash matches
  IF p_user_id IS NOT NULL AND v_stored_user_id IS NOT NULL AND p_user_id = v_stored_user_id THEN
    -- User owns this cultivar, skip edit key check
    NULL;
  ELSIF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
  ELSIF p_edit_key_hash IS NULL OR p_edit_key_hash <> v_stored_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
  END IF;

  UPDATE cultivars SET
    cultivar_name = COALESCE(p_new_cultivar_name, cultivar_name),
    genus = COALESCE(p_new_genus, genus),
    type = COALESCE(p_new_type, type),
    origins = COALESCE(p_origins, origins),
    updated_at = now()
  WHERE id = v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID) TO anon, authenticated;
