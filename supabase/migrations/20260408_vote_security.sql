-- ============================================
-- 1. Vote Sybil attack prevention
--    Store votes in a dedicated table with unique constraint per user
-- ============================================

-- Votes table: one row per user per origin
CREATE TABLE IF NOT EXISTS public.origin_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cultivar_name TEXT NOT NULL,
  origin_idx INT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('agree', 'disagree')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cultivar_name, origin_idx, user_id)
);

-- RLS for origin_votes
ALTER TABLE public.origin_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can read vote counts (public data)
CREATE POLICY "Anyone can read votes" ON public.origin_votes
  FOR SELECT USING (true);

-- Authenticated users can insert their own votes
CREATE POLICY "Authenticated users can vote" ON public.origin_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own vote (change agree<->disagree)
CREATE POLICY "Users can update own vote" ON public.origin_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own vote (unvote)
CREATE POLICY "Users can delete own vote" ON public.origin_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.origin_votes TO authenticated;
GRANT SELECT ON public.origin_votes TO anon;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_origin_votes_lookup
  ON public.origin_votes(cultivar_name, origin_idx);

-- ============================================
-- 2. Updated cast_origin_vote with user authentication
--    Prevents duplicate votes at DB level
-- ============================================

CREATE OR REPLACE FUNCTION public.cast_origin_vote(
  p_cultivar_name TEXT,
  p_origin_idx INT,
  p_vote_type TEXT  -- 'agree' or 'disagree'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote TEXT;
  v_origins JSONB;
  v_origin JSONB;
  v_votes JSONB;
  v_agree INT;
  v_disagree INT;
  v_base_trust NUMERIC;
  v_net NUMERIC;
  v_total INT;
  v_adjustment NUMERIC;
  v_new_trust INT;
BEGIN
  -- Require authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_vote_type NOT IN ('agree', 'disagree') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote type');
  END IF;

  -- Input length validation
  IF length(p_cultivar_name) > 255 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid cultivar name');
  END IF;

  -- Check for existing vote by this user on this origin
  SELECT vote_type INTO v_existing_vote
    FROM origin_votes
   WHERE cultivar_name = p_cultivar_name
     AND origin_idx = p_origin_idx
     AND user_id = v_user_id;

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Already voted same way — remove vote (toggle off)
      DELETE FROM origin_votes
       WHERE cultivar_name = p_cultivar_name
         AND origin_idx = p_origin_idx
         AND user_id = v_user_id;
    ELSE
      -- Change vote direction
      UPDATE origin_votes
         SET vote_type = p_vote_type
       WHERE cultivar_name = p_cultivar_name
         AND origin_idx = p_origin_idx
         AND user_id = v_user_id;
    END IF;
  ELSE
    -- New vote
    INSERT INTO origin_votes (cultivar_name, origin_idx, user_id, vote_type)
    VALUES (p_cultivar_name, p_origin_idx, v_user_id, p_vote_type);
  END IF;

  -- Lock cultivar row and recalculate from actual vote records
  SELECT origins INTO v_origins
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   FOR UPDATE;

  IF v_origins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  IF p_origin_idx < 0 OR p_origin_idx >= jsonb_array_length(v_origins) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid origin index');
  END IF;

  -- Count actual votes from the table (authoritative source)
  SELECT
    COALESCE(SUM(CASE WHEN vote_type = 'agree' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote_type = 'disagree' THEN 1 ELSE 0 END), 0)
  INTO v_agree, v_disagree
  FROM origin_votes
  WHERE cultivar_name = p_cultivar_name AND origin_idx = p_origin_idx;

  v_origin := v_origins->p_origin_idx;

  -- Preserve base_trust on first vote
  IF v_origin->'base_trust' IS NULL THEN
    v_base_trust := COALESCE((v_origin->>'trust')::numeric, 50);
    v_origin := jsonb_set(v_origin, '{base_trust}', to_jsonb(v_base_trust));
  ELSE
    v_base_trust := (v_origin->>'base_trust')::numeric;
  END IF;

  -- Update vote counts in origin JSONB
  v_origin := jsonb_set(v_origin, '{votes}',
    jsonb_build_object('agree', v_agree, 'disagree', v_disagree));

  -- Recalculate trust
  v_total := v_agree + v_disagree;
  v_net := v_agree - v_disagree;
  v_adjustment := CASE WHEN v_total > 0 THEN (v_net / (v_total + 5.0)) * 25.0 ELSE 0 END;
  v_new_trust := GREATEST(5, LEAST(98, ROUND(v_base_trust + v_adjustment)));

  v_origin := jsonb_set(v_origin, '{trust}', to_jsonb(v_new_trust));
  v_origins := jsonb_set(v_origins, ARRAY[p_origin_idx::text], v_origin);

  UPDATE cultivars SET origins = v_origins WHERE cultivar_name = p_cultivar_name;

  RETURN jsonb_build_object(
    'success', true,
    'new_agree', v_agree,
    'new_disagree', v_disagree,
    'new_trust', v_new_trust,
    'base_trust', v_base_trust,
    'user_vote', CASE
      WHEN v_existing_vote IS NOT NULL AND v_existing_vote = p_vote_type THEN NULL  -- toggled off
      ELSE p_vote_type
    END
  );
END;
$$;

-- ============================================
-- 3. cultivar_images RLS
--    Table lacks user_id; add it, then apply RLS
-- ============================================

-- Add user_id column for ownership tracking
ALTER TABLE public.cultivar_images
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cultivar_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view images
CREATE POLICY "Anyone can view images" ON public.cultivar_images
  FOR SELECT USING (true);

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images" ON public.cultivar_images
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only the uploader or admin can update
CREATE POLICY "Uploaders can update own images" ON public.cultivar_images
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_admin' = 'true')
    )
  );

-- Only the uploader or admin can delete
CREATE POLICY "Uploaders can delete own images" ON public.cultivar_images
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'is_admin' = 'true')
    )
  );
