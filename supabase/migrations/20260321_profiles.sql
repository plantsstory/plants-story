-- ============================================
-- Profiles Migration
-- Adds profiles table for user profile pages
-- ============================================

-- 1. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  sns_instagram TEXT DEFAULT '',
  sns_twitter TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Owner insert profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner update profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 3. Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Upsert RPC for profile editing (handles existing users without profile row)
CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_display_name TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_sns_instagram TEXT DEFAULT NULL,
  p_sns_twitter TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  INSERT INTO public.profiles (id, display_name, bio, sns_instagram, sns_twitter, avatar_url)
  VALUES (
    auth.uid(),
    COALESCE(p_display_name, ''),
    COALESCE(p_bio, ''),
    COALESCE(p_sns_instagram, ''),
    COALESCE(p_sns_twitter, ''),
    COALESCE(p_avatar_url, '')
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(p_display_name, profiles.display_name),
    bio = COALESCE(p_bio, profiles.bio),
    sns_instagram = COALESCE(p_sns_instagram, profiles.sns_instagram),
    sns_twitter = COALESCE(p_sns_twitter, profiles.sns_twitter),
    avatar_url = COALESCE(p_avatar_url, profiles.avatar_url),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
