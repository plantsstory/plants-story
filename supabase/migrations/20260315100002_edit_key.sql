-- ============================================
-- Edit Key Migration
-- Adds 4-digit edit key support for cultivar editing
-- ============================================

-- 1. Add edit_key_hash column
ALTER TABLE public.cultivars
  ADD COLUMN IF NOT EXISTS edit_key_hash TEXT;

-- 2. RPC function to insert cultivar with edit key
-- Hashes the edit key server-side using SHA256
CREATE OR REPLACE FUNCTION public.insert_with_edit_key(
  p_genus TEXT,
  p_cultivar_name TEXT,
  p_type TEXT,
  p_origins JSONB,
  p_edit_key TEXT DEFAULT NULL,
  p_ai_status TEXT DEFAULT 'pending'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_row cultivars%ROWTYPE;
BEGIN
  -- Hash the edit key if provided
  IF p_edit_key IS NOT NULL AND p_edit_key <> '' THEN
    v_hash := encode(digest(p_edit_key, 'sha256'), 'hex');
  END IF;

  INSERT INTO cultivars (genus, cultivar_name, type, origins, votes, ai_status, edit_key_hash)
  VALUES (p_genus, p_cultivar_name, p_type, p_origins, '{}'::json, p_ai_status, v_hash)
  RETURNING * INTO v_row;

  RETURN jsonb_build_object('success', true, 'id', v_row.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_with_edit_key(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO anon, authenticated;

-- 3. RPC function to update cultivar with edit key verification
CREATE OR REPLACE FUNCTION public.update_with_edit_key(
  p_cultivar_name TEXT,
  p_edit_key TEXT,
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
  v_stored_hash TEXT;
  v_input_hash TEXT;
BEGIN
  -- Find the cultivar and get its edit key hash
  SELECT id, edit_key_hash
    INTO v_id, v_stored_hash
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Check if cultivar has an edit key set
  IF v_stored_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No edit key set for this cultivar');
  END IF;

  -- Verify edit key
  v_input_hash := encode(digest(p_edit_key, 'sha256'), 'hex');
  IF v_input_hash <> v_stored_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid edit key');
  END IF;

  -- Update fields that were provided
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

GRANT EXECUTE ON FUNCTION public.update_with_edit_key(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- 4. Enable pgcrypto extension for digest function
CREATE EXTENSION IF NOT EXISTS pgcrypto;
