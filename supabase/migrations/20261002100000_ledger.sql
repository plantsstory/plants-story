-- Bookkeeping in the admin screen (帳簿 + 株台帳). Admin only: nothing here is readable by visitors.
-- Double entry, one debit and one credit per row; a sale with a fee is several rows sharing group_id.
-- Purchases of plants are expensed as 仕入高 and the year-end stock (株台帳) is the inventory adjustment,
-- so no cost-of-sale row is posted per sale.

CREATE TABLE IF NOT EXISTS public.ledger_channels (
  slug text PRIMARY KEY,
  label text NOT NULL,
  fee_rate numeric(6,4) NOT NULL DEFAULT 0,     -- 0.1000 = 10%
  fee_fixed integer NOT NULL DEFAULT 0,          -- yen per order
  payout_fee integer NOT NULL DEFAULT 0,         -- yen per payout
  note text,
  sort_order integer NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public.plant_stock (
  id bigserial PRIMARY KEY,
  code text NOT NULL UNIQUE,                     -- 管理番号, also the shop SKU (P-2026-001)
  name text NOT NULL,                            -- 品種名 (with the species epithet)
  supplier text,
  purchased_on date NOT NULL,
  cost integer NOT NULL DEFAULT 0,               -- 仕入れ値 (yen); offsets start at their own small cost
  status text NOT NULL DEFAULT 'stock' CHECK (status IN ('stock', 'mother', 'sold', 'dead')),
  status_date date,                              -- date of the last status change
  mother_purpose text,                           -- what the mother plant is used for (required to convert)
  asset_method text CHECK (asset_method IN ('small', 'small_blue', 'lump3', 'straight')),
  useful_years integer,                          -- straight-line only
  parent_id bigint REFERENCES public.plant_stock (id) ON DELETE SET NULL,   -- offsets point at their mother
  sold_on date,
  sale_price integer,
  channel text REFERENCES public.ledger_channels (slug),
  photo_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id bigserial PRIMARY KEY,
  entry_date date NOT NULL,
  debit text NOT NULL,
  credit text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  description text NOT NULL,                     -- 摘要
  partner text,                                  -- 取引先
  channel text REFERENCES public.ledger_channels (slug),   -- which shop's balance (売掛金) it touches
  plant_id bigint REFERENCES public.plant_stock (id) ON DELETE SET NULL,
  group_id uuid,
  source text NOT NULL DEFAULT 'manual',         -- manual / template / sale / payout / csv / plant / depreciation
  source_ref text,                               -- external id (order number) to keep imports idempotent
  receipt_path text,                             -- private storage path
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (debit <> credit)
);
CREATE INDEX IF NOT EXISTS ledger_entries_date_idx ON public.ledger_entries (entry_date);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_entries_source_ref_key ON public.ledger_entries (source, source_ref, debit, credit) WHERE source_ref IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.ledger_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);

ALTER TABLE public.ledger_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ledger_channels', 'plant_stock', 'ledger_entries', 'ledger_settings'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin only %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admin only %1$s" ON public.%1$I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS plant_stock_touch ON public.plant_stock;
CREATE TRIGGER plant_stock_touch BEFORE UPDATE ON public.plant_stock FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS ledger_entries_touch ON public.ledger_entries;
CREATE TRIGGER ledger_entries_touch BEFORE UPDATE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- sales channels; rates are editable in the admin screen (check them against each service's current fees)
INSERT INTO public.ledger_channels (slug, label, fee_rate, fee_fixed, payout_fee, note, sort_order) VALUES
  ('mercari_shops', 'メルカリShops', 0.1000, 0, 0, '販売手数料 10%。振込手数料は管理画面で設定', 1),
  ('base', 'BASE', 0.0660, 40, 250, 'スタンダード: 決済 3.6%+40円 + サービス利用料 3%。振込 250円', 2),
  ('stores', 'STORES', 0, 0, 0, '手数料率をプランに合わせて設定してください', 3),
  ('payjp', 'PAY.JP（会員）', 0.0330, 0, 0, '決済手数料 3.3%', 4),
  ('rakuten_af', '楽天アフィリエイト', 0, 0, 0, '報酬は楽天キャッシュで受け取り', 5),
  ('moshimo', 'もしもアフィリエイト', 0, 0, 0, NULL, 6),
  ('yahoo_af', 'Yahoo!アフィリエイト', 0, 0, 0, NULL, 7)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ledger_settings (key, value) VALUES
  ('blue_return', 'true'::jsonb),        -- 青色申告: enables the 30万円未満 少額減価償却資産の特例
  ('opened_on', 'null'::jsonb)           -- 開業日
ON CONFLICT (key) DO NOTHING;

-- receipts and plant photos: private bucket, admin only
INSERT INTO storage.buckets (id, name, public) VALUES ('ledger-receipts', 'ledger-receipts', false)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Admin read ledger receipts" ON storage.objects;
CREATE POLICY "Admin read ledger receipts" ON storage.objects FOR SELECT USING (bucket_id = 'ledger-receipts' AND public.is_admin());
DROP POLICY IF EXISTS "Admin write ledger receipts" ON storage.objects;
CREATE POLICY "Admin write ledger receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ledger-receipts' AND public.is_admin());
DROP POLICY IF EXISTS "Admin update ledger receipts" ON storage.objects;
CREATE POLICY "Admin update ledger receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'ledger-receipts' AND public.is_admin());
DROP POLICY IF EXISTS "Admin delete ledger receipts" ON storage.objects;
CREATE POLICY "Admin delete ledger receipts" ON storage.objects FOR DELETE USING (bucket_id = 'ledger-receipts' AND public.is_admin());

-- the real date a plant came into hand (plants owned before opening are booked on the opening date),
-- and the date a stock plant became a mother plant (kept when it is later sold or dies)
ALTER TABLE public.plant_stock ADD COLUMN IF NOT EXISTS acquired_on date, ADD COLUMN IF NOT EXISTS mother_on date;
