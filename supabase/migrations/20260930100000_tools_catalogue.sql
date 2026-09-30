-- Tools catalogue (/tools/ and /tools/<slug>/): the existing affiliates table becomes the catalogue.
-- Every new column is nullable, so the old shelf keeps working and this is reversible
-- (drop the added columns and the tool_genres table).

CREATE TABLE IF NOT EXISTS public.tool_genres (
  slug text PRIMARY KEY,
  code text NOT NULL,            -- mono label, e.g. SOIL
  label text NOT NULL,           -- 用土・軽石
  label_en text,
  lead text,                     -- one sentence shown on the genre filter
  sort_order integer NOT NULL DEFAULT 100,
  is_published boolean NOT NULL DEFAULT true
);

ALTER TABLE public.tool_genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read published tool_genres" ON public.tool_genres;
CREATE POLICY "Read published tool_genres" ON public.tool_genres
  FOR SELECT USING (is_published OR public.is_admin());
DROP POLICY IF EXISTS "Admin write tool_genres" ON public.tool_genres;
CREATE POLICY "Admin write tool_genres" ON public.tool_genres
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS genre text REFERENCES public.tool_genres (slug) ON UPDATE CASCADE,
  ADD COLUMN IF NOT EXISTS maker text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS spec text,
  ADD COLUMN IF NOT EXISTS price_band text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS habitat_tags text[],
  ADD COLUMN IF NOT EXISTS image_own text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_slug_key ON public.affiliates (slug) WHERE slug IS NOT NULL;

-- unpublished drafts are no longer readable by anonymous visitors
DROP POLICY IF EXISTS "Anyone can read affiliates" ON public.affiliates;
CREATE POLICY "Anyone can read affiliates" ON public.affiliates
  FOR SELECT USING (is_published OR public.is_admin());

CREATE OR REPLACE FUNCTION public.touch_affiliates_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS affiliates_touch ON public.affiliates;
CREATE TRIGGER affiliates_touch BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.touch_affiliates_updated_at();

-- Moshimo (Amazon) impression pixel is stored as given, and a link check date for the admin's check mode
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS amazon_imp text,
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

-- nine genres (board 5, C1)
INSERT INTO public.tool_genres (slug, code, label, label_en, sort_order, lead) VALUES
  ('soil', 'SOIL', '用土・植込み材', 'Substrates', 1, '軽石・日向土・ベラボン・水苔・バーク。配合の比率は書きません。'),
  ('mount', 'MOUNT', '着生・ヘゴ', 'Mounts', 2, 'ヘゴ板・コルク・結束資材。樹上に着生する種の根の置き場所です。'),
  ('pots', 'POTS', '鉢', 'Pots', 3, 'スリット鉢・プラ鉢・腰水の容器。'),
  ('humidity', 'AIR', '湿度・送風', 'Humidity & air', 4, '加湿器・霧吹き・サーキュレーター。雲霧林の空気に近づけるための道具です。'),
  ('heat', 'HEAT', '温度', 'Heat', 5, 'パネルヒーター・サーモスタット・簡易温室。'),
  ('light', 'LIGHT', '光', 'Light', 6, '植物育成LED・ソケット・タイマー。林床や樹冠下の光に近づけるための道具です。'),
  ('measure', 'MEASURE', '計測', 'Measure', 7, '温湿度計・照度計・水分計。環境を数字で記録するための道具です。'),
  ('nutrient', 'NUTRIENT', '肥料・活力剤', 'Nutrients', 8, '商品名・成分表示・容量だけを載せます。効能・用量・頻度は書きません。'),
  ('books', 'BOOKS', '書籍・資料', 'Books', 9, '当サイトの出典に現れる本だけを載せます。')
ON CONFLICT (slug) DO UPDATE SET code = EXCLUDED.code, label = EXCLUDED.label, label_en = EXCLUDED.label_en, sort_order = EXCLUDED.sort_order, lead = EXCLUDED.lead;

-- the seven existing items get a slug and a genre
UPDATE public.affiliates SET slug = 'easypump-mist-sprayer-1l', genre = 'humidity' WHERE id = 1 AND slug IS NULL;
UPDATE public.affiliates SET slug = 'sustee', genre = 'measure' WHERE id = 7 AND slug IS NULL;
UPDATE public.affiliates SET slug = 'superthrive-120ml', genre = 'nutrient' WHERE id = 2 AND slug IS NULL;
UPDATE public.affiliates SET slug = 'hb-101', genre = 'nutrient' WHERE id = 5 AND slug IS NULL;
UPDATE public.affiliates SET slug = 'biobizz-calmag-500ml', genre = 'nutrient' WHERE id = 6 AND slug IS NULL;
UPDATE public.affiliates SET slug = 'slow-release-fertilizer-1-1kg', genre = 'nutrient' WHERE id = 4 AND slug IS NULL;
UPDATE public.affiliates SET slug = 'premium-indoor-soil', genre = 'soil' WHERE id = 3 AND slug IS NULL;

-- species this tool is used for (cultivar names, picked by the admin; species rows carry no habitat tags yet)
ALTER TABLE public.affiliates ADD COLUMN IF NOT EXISTS species text[];
