-- ============================================
-- Remove edit key system: require authentication for all write operations
-- ============================================

-- 1. Replace insert function: require auth, remove edit key
DROP FUNCTION IF EXISTS public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.insert_with_edit_key_hash(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_ai_status TEXT DEFAULT 'pending',
  p_created_ip TEXT DEFAULT NULL
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

  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash, created_ip, user_id)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, NULL, p_created_ip, auth.uid())
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_with_edit_key_hash(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;

-- 2. Replace update function: require auth, remove edit key
DROP FUNCTION IF EXISTS public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, UUID);
DROP FUNCTION IF EXISTS public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.update_with_edit_key_hash(
  p_cultivar_name TEXT,
  p_new_cultivar_name TEXT DEFAULT NULL,
  p_new_genus TEXT DEFAULT NULL,
  p_new_type TEXT DEFAULT NULL,
  p_origins JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_stored_user_id UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT id, user_id
    INTO v_id, v_stored_user_id
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Allow update if: owner or admin
  IF NOT (
    (v_stored_user_id IS NOT NULL AND v_caller_id = v_stored_user_id)
    OR public.is_admin()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
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

GRANT EXECUTE ON FUNCTION public.update_with_edit_key_hash(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 3. Replace delete function: require auth, remove edit key
DROP FUNCTION IF EXISTS public.delete_with_edit_key_hash(BIGINT, TEXT);

CREATE OR REPLACE FUNCTION public.delete_with_edit_key_hash(
  p_cultivar_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stored_user_id UUID;
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT user_id
    INTO v_stored_user_id
    FROM cultivars
   WHERE id = p_cultivar_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Allow delete if: owner or admin
  IF NOT (
    (v_stored_user_id IS NOT NULL AND v_caller_id = v_stored_user_id)
    OR public.is_admin()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  DELETE FROM cultivars WHERE id = p_cultivar_id;

  RETURN jsonb_build_object('success', true, 'id', p_cultivar_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_with_edit_key_hash(BIGINT) TO authenticated;

-- 4. Cleanup: drop edit key rate limiting functions and table
DROP FUNCTION IF EXISTS public.check_edit_key_rate_limit(bigint);
DROP FUNCTION IF EXISTS public.clear_edit_key_attempts(bigint);
DROP TABLE IF EXISTS public.edit_key_attempts;
