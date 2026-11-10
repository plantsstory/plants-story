-- 2026-11-10 (owner): products found by the automatic research are candidates until the owner accepts them.
-- The review state lives beside the catalogue row, readable by the admin only (the AI's note is not for readers).
-- A row of affiliates without a review: published = accepted before this existed; unpublished = a candidate.
CREATE TABLE IF NOT EXISTS public.tool_reviews (
  affiliate_id     integer PRIMARY KEY REFERENCES public.affiliates(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate', 'approved', 'rejected')),
  postage_included boolean,                                   -- Rakuten's postageFlag when it was found (null = not told)
  store_fit        text CHECK (store_fit IN ('online', 'either', 'store')),   -- the model's guess against a home centre
  ai_note          text,
  reject_reason    text,
  reviewed_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tool_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only tool_reviews" ON public.tool_reviews;
CREATE POLICY "Admin only tool_reviews" ON public.tool_reviews FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE ALL ON public.tool_reviews FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tool_reviews TO authenticated;
