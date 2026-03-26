-- RPC function to append a manual origin to a cultivar's origins array.
-- Uses SECURITY DEFINER so anonymous users can update the origins column
-- without needing UPDATE permission on the whole table.
CREATE OR REPLACE FUNCTION public.append_origin(
  p_cultivar_name TEXT,
  p_origin JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_origins JSONB;
BEGIN
  -- Find the cultivar
  SELECT id, COALESCE(origins, '[]'::jsonb)
    INTO v_id, v_origins
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Append the new origin
  v_origins := v_origins || jsonb_build_array(p_origin);

  -- Update
  UPDATE cultivars SET origins = v_origins WHERE id = v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

-- Allow anon and authenticated to call this function
GRANT EXECUTE ON FUNCTION public.append_origin(TEXT, JSONB) TO anon, authenticated;
