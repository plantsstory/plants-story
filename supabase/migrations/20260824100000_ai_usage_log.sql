-- ============================================
-- AI usage log: per-call token usage from research-origin
-- so the admin dashboard can show estimated OpenAI spend
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  provider TEXT NOT NULL,          -- 'openai' | 'groq' | 'gemini'
  model TEXT NOT NULL,
  purpose TEXT,                    -- 'species-structured' | 'keyword-research' | 'verify' | ...
  cultivar_name TEXT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  web_search_calls INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ai_usage_log_created_idx ON public.ai_usage_log (created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Admin can read; inserts happen only via service role (Edge Functions)
CREATE POLICY "Admin read ai_usage_log" ON public.ai_usage_log
  FOR SELECT USING (public.is_admin());
