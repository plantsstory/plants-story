-- ============================================
-- Image vote security: per-user tracking + auth + rate limit
-- Replaces simple counter with tracked votes (like origin_votes)
-- ============================================

-- 1. Per-user image vote tracking table
CREATE TABLE IF NOT EXISTS public.image_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL REFERENCES public.cultivar_images(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('real', 'fake')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(image_id, user_id)
);

-- RLS
ALTER TABLE public.image_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read image votes" ON public.image_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote on images" ON public.image_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own image vote" ON public.image_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own image vote" ON public.image_votes
  FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_votes TO authenticated;
GRANT SELECT ON public.image_votes TO anon;

CREATE INDEX IF NOT EXISTS idx_image_votes_image_id ON public.image_votes(image_id);
CREATE INDEX IF NOT EXISTS idx_image_votes_user_id ON public.image_votes(user_id);

-- 2. Updated vote_on_image RPC with auth + per-user tracking + rate limit
CREATE OR REPLACE FUNCTION public.vote_on_image(
  p_image_id UUID,
  p_vote_type TEXT,
  p_prev_vote TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_real INT;
  v_fake INT;
  v_recent_count INT;
BEGIN
  -- 1. Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required');
  END IF;

  -- 2. Validate vote type
  IF p_vote_type NOT IN ('real', 'fake') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid vote type');
  END IF;

  -- 3. Rate limit: max 30 image votes per minute per user
  SELECT COUNT(*) INTO v_recent_count
    FROM image_votes
    WHERE user_id = v_user_id
      AND created_at > now() - interval '1 minute';
  IF v_recent_count >= 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rate limit exceeded');
  END IF;

  -- 4. Check existing vote by this user on this image
  SELECT vote_type INTO v_existing_vote
    FROM image_votes
    WHERE image_id = p_image_id AND user_id = v_user_id;

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Same vote again = toggle off (remove vote)
      DELETE FROM image_votes
        WHERE image_id = p_image_id AND user_id = v_user_id;
    ELSE
      -- Switch vote direction
      UPDATE image_votes
        SET vote_type = p_vote_type, created_at = now()
        WHERE image_id = p_image_id AND user_id = v_user_id;
    END IF;
  ELSE
    -- New vote
    INSERT INTO image_votes (image_id, user_id, vote_type)
    VALUES (p_image_id, v_user_id, p_vote_type);
  END IF;

  -- 5. Recalculate from actual vote records (authoritative)
  SELECT
    COALESCE(SUM(CASE WHEN vote_type = 'real' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote_type = 'fake' THEN 1 ELSE 0 END), 0)
  INTO v_real, v_fake
  FROM image_votes
  WHERE image_id = p_image_id;

  -- 6. Update denormalized counts on cultivar_images
  UPDATE cultivar_images
    SET real_votes = v_real, fake_votes = v_fake
    WHERE id = p_image_id;

  RETURN jsonb_build_object(
    'ok', true,
    'real_votes', v_real,
    'fake_votes', v_fake,
    'user_vote', CASE
      WHEN v_existing_vote IS NOT NULL AND v_existing_vote = p_vote_type THEN NULL
      ELSE p_vote_type
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.vote_on_image(UUID, TEXT, TEXT) TO authenticated;
