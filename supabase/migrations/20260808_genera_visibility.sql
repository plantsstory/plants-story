-- ============================================
-- Genus visibility flag
-- ============================================
-- Allows hiding genera from the public site without deleting their
-- data. Hidden genera stay manageable from the admin panel and can be
-- re-enabled at any time.

ALTER TABLE public.genera
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

-- Launch with Anthurium only; other genera stay in the DB but hidden.
UPDATE public.genera SET is_visible = false WHERE slug <> 'anthurium';
