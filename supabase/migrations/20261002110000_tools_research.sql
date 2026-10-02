-- Tools catalogue as a shop (owner, 2026-10-02): every department filled by research on the Rakuten
-- Ichiba API, an image next to every name, store links in place of a buy button.
-- Items found by research are told apart from the ones the operator uses (owner_used), so the PR line stays true.

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',      -- manual / rakuten
  ADD COLUMN IF NOT EXISTS ext_id text,                                -- Rakuten itemCode
  ADD COLUMN IF NOT EXISTS description text,                           -- neutral product description (not a record of use)
  ADD COLUMN IF NOT EXISTS owner_used boolean NOT NULL DEFAULT false,  -- 「使用中」: the operator actually uses it
  ADD COLUMN IF NOT EXISTS price integer,                              -- price at the store when last checked
  ADD COLUMN IF NOT EXISTS price_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS shop_name text,
  ADD COLUMN IF NOT EXISTS review_count integer,
  ADD COLUMN IF NOT EXISTS review_average numeric(3,2);
CREATE UNIQUE INDEX IF NOT EXISTS affiliates_ext_id_key ON public.affiliates (source, ext_id) WHERE ext_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.tool_research_queries (
  id bigserial PRIMARY KEY,
  genre text NOT NULL REFERENCES public.tool_genres (slug) ON UPDATE CASCADE ON DELETE CASCADE,
  keyword text NOT NULL,
  min_reviews integer NOT NULL DEFAULT 20,
  max_items integer NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  UNIQUE (genre, keyword)
);
ALTER TABLE public.tool_research_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin only tool_research_queries" ON public.tool_research_queries;
CREATE POLICY "Admin only tool_research_queries" ON public.tool_research_queries FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
REVOKE ALL ON public.tool_research_queries FROM anon;

-- search words per department (editable in the admin screen). Books stay curated by hand: only books cited as sources.
INSERT INTO public.tool_research_queries (genre, keyword, max_items) VALUES
  ('soil', '日向土 小粒', 2), ('soil', '鹿沼土 小粒', 1), ('soil', '硬質赤玉土 小粒', 1), ('soil', 'ベラボン', 1),
  ('soil', 'パーライト 園芸', 1), ('soil', '軽石 小粒 園芸', 1), ('soil', '水苔 ニュージーランド', 1), ('soil', 'バークチップ 洋蘭', 1),
  ('mount', 'ヘゴ板', 2), ('mount', 'コルク板 着生', 2), ('mount', 'ヘゴ棒 支柱', 1), ('mount', '園芸 麻ひも', 1),
  ('pots', 'スリット鉢', 2), ('pots', 'プラ鉢 観葉植物', 1), ('pots', '鉢底ネット', 1), ('pots', '鉢 受け皿 プラスチック', 1),
  ('humidity', '加湿器 超音波 卓上', 1), ('humidity', '霧吹き 蓄圧式', 2), ('humidity', 'サーキュレーター 小型', 2), ('humidity', 'ビニール温室 ラック', 1),
  ('heat', 'パネルヒーター 植物', 2), ('heat', 'サーモスタット 園芸', 1), ('heat', '温室 ヒーター 園芸', 1), ('heat', '保温シート 植物', 1),
  ('light', '植物育成ライト LED', 2), ('light', '植物育成ライト スポット', 1), ('light', 'プログラムタイマー コンセント', 1), ('light', 'クリップライト E26 ソケット', 1),
  ('measure', '温湿度計 デジタル', 2), ('measure', '照度計', 1), ('measure', '土壌水分計 植物', 1), ('measure', '最高最低温度計', 1),
  ('nutrient', '液体肥料 観葉植物', 1), ('nutrient', '活力剤 観葉植物', 1), ('nutrient', '緩効性肥料 観葉植物', 1), ('nutrient', 'カルシウム マグネシウム 植物', 1)
ON CONFLICT (genre, keyword) DO NOTHING;
