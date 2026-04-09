-- Atomic image vote RPC: eliminates N+1 pattern (SELECT + UPDATE → single RPC)
CREATE OR REPLACE FUNCTION public.vote_on_image(
  p_image_id UUID,
  p_vote_type TEXT,   -- 'real' or 'fake'
  p_prev_vote TEXT DEFAULT NULL  -- previous vote to undo, or NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
  v_real INT;
  v_fake INT;
BEGIN
  -- Validate vote type
  IF p_vote_type NOT IN ('real', 'fake') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid vote type');
  END IF;
  IF p_prev_vote IS NOT NULL AND p_prev_vote NOT IN ('real', 'fake') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid prev vote type');
  END IF;

  -- Lock row and get current counts
  SELECT real_votes, fake_votes INTO v_row
    FROM public.cultivar_images
    WHERE id = p_image_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Image not found');
  END IF;

  v_real := COALESCE(v_row.real_votes, 0);
  v_fake := COALESCE(v_row.fake_votes, 0);

  -- Increment new vote
  IF p_vote_type = 'real' THEN v_real := v_real + 1; END IF;
  IF p_vote_type = 'fake' THEN v_fake := v_fake + 1; END IF;

  -- Decrement old vote if switching
  IF p_prev_vote = 'real' THEN v_real := GREATEST(0, v_real - 1); END IF;
  IF p_prev_vote = 'fake' THEN v_fake := GREATEST(0, v_fake - 1); END IF;

  -- Update
  UPDATE public.cultivar_images
    SET real_votes = v_real, fake_votes = v_fake
    WHERE id = p_image_id;

  RETURN jsonb_build_object('ok', true, 'real_votes', v_real, 'fake_votes', v_fake);
END;
$$;
