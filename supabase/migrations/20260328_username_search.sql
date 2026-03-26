-- ============================================
-- Username & Profile Search Migration
-- Adds optional username field and search RPCs
-- ============================================

-- 1. Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username TEXT;

-- 2. Case-insensitive unique index (NULL allowed = optional)
CREATE UNIQUE INDEX profiles_username_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 3. Trigram extension for partial text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 4. GIN index for display_name substring search
CREATE INDEX profiles_display_name_trgm
  ON public.profiles USING gin (display_name gin_trgm_ops);

-- 5. B-tree index for username prefix search
CREATE INDEX profiles_username_btree
  ON public.profiles (LOWER(username) text_pattern_ops)
  WHERE username IS NOT NULL;

-- 6. Drop old upsert_profile and recreate with username parameter
DROP FUNCTION IF EXISTS public.upsert_profile(TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.upsert_profile(
  p_display_name TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_sns_instagram TEXT DEFAULT NULL,
  p_sns_twitter TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_username TEXT DEFAULT NULL
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

  -- Validate username format if provided
  IF p_username IS NOT NULL AND p_username <> '' THEN
    IF p_username !~ '^[a-zA-Z0-9_]{3,20}$' THEN
      RETURN jsonb_build_object('success', false, 'error',
        'ユーザー名は3〜20文字の英数字とアンダースコアのみ使用できます');
    END IF;
  ELSE
    p_username := NULL;  -- normalize empty string to NULL
  END IF;

  INSERT INTO public.profiles (id, display_name, bio, sns_instagram, sns_twitter, avatar_url, username)
  VALUES (
    auth.uid(),
    COALESCE(p_display_name, ''),
    COALESCE(p_bio, ''),
    COALESCE(p_sns_instagram, ''),
    COALESCE(p_sns_twitter, ''),
    COALESCE(p_avatar_url, ''),
    p_username
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(p_display_name, profiles.display_name),
    bio = COALESCE(p_bio, profiles.bio),
    sns_instagram = COALESCE(p_sns_instagram, profiles.sns_instagram),
    sns_twitter = COALESCE(p_sns_twitter, profiles.sns_twitter),
    avatar_url = COALESCE(p_avatar_url, profiles.avatar_url),
    username = CASE
      WHEN p_username IS NOT NULL THEN p_username
      ELSE profiles.username
    END,
    updated_at = now();

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error',
      'このユーザー名は既に使われています');
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 7. Search profiles RPC
CREATE OR REPLACE FUNCTION public.search_profiles(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  post_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_query IS NULL OR TRIM(p_query) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    COUNT(c.id) AS post_count
  FROM profiles p
  LEFT JOIN cultivars c ON c.user_id = p.id
  WHERE p.username ILIKE p_query || '%'
     OR p.display_name ILIKE '%' || p_query || '%'
  GROUP BY p.id, p.username, p.display_name, p.avatar_url, p.bio
  ORDER BY
    CASE
      WHEN LOWER(p.username) = LOWER(p_query) THEN 0
      WHEN p.username ILIKE p_query || '%' THEN 1
      WHEN LOWER(p.display_name) = LOWER(p_query) THEN 2
      ELSE 3
    END,
    COUNT(c.id) DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT, INT) TO anon, authenticated;

-- 8. Resolve username to UUID
CREATE OR REPLACE FUNCTION public.resolve_username(p_username TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE LOWER(username) = LOWER(p_username) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_username(TEXT) TO anon, authenticated;

-- 9. Check username availability
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate format
  IF p_username IS NULL OR p_username = '' THEN
    RETURN jsonb_build_object('available', false, 'reason', 'ユーザー名を入力してください');
  END IF;

  IF p_username !~ '^[a-zA-Z0-9_]{3,20}$' THEN
    RETURN jsonb_build_object('available', false, 'reason',
      '3〜20文字の英数字とアンダースコアのみ');
  END IF;

  -- Check uniqueness (exclude own username)
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE LOWER(username) = LOWER(p_username)
      AND id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
  ) THEN
    RETURN jsonb_build_object('available', false, 'reason', 'このユーザー名は既に使われています');
  END IF;

  RETURN jsonb_build_object('available', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon, authenticated;
