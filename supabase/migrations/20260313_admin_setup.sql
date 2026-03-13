-- ============================================
-- Admin Setup Migration
-- ============================================

-- 1. Admin check function (uses app_metadata.role)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  )
$$;

-- 2. Enable RLS on cultivars
ALTER TABLE public.cultivars ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone can read
CREATE POLICY "Public read" ON public.cultivars
  FOR SELECT USING (true);

-- Anyone can insert (anonymous cultivar submission)
CREATE POLICY "Public insert" ON public.cultivars
  FOR INSERT WITH CHECK (true);

-- Only admin can update
CREATE POLICY "Admin update" ON public.cultivars
  FOR UPDATE USING (public.is_admin());

-- Only admin can delete
CREATE POLICY "Admin delete" ON public.cultivars
  FOR DELETE USING (public.is_admin());

-- 4. Add timestamp columns
ALTER TABLE public.cultivars
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
