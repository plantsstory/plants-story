-- ============================================
-- Genera Management Table
-- ============================================

-- 1. Create genera table
CREATE TABLE public.genera (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  has_seedlings BOOLEAN NOT NULL DEFAULT false,
  card_image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.genera ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Public read genera" ON public.genera
  FOR SELECT USING (true);

CREATE POLICY "Admin insert genera" ON public.genera
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admin update genera" ON public.genera
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admin delete genera" ON public.genera
  FOR DELETE USING (public.is_admin());

-- 4. Seed existing genera
INSERT INTO public.genera (name, slug, display_order, has_seedlings, card_image_path) VALUES
  ('Anthurium',    'anthurium',    1, true,  'anthurium.png'),
  ('Monstera',     'monstera',     2, false, 'monstera.png'),
  ('Philodendron', 'philodendron', 3, false, 'philodendron.png');
