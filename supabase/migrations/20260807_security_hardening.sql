-- ============================================
-- Security Hardening (2026-08-07)
-- 1. append_origin: require auth, whitelist-rebuild payload server-side,
--    force trust/source_type/author, per-cultivar cap + per-user rate limit
-- 2. profiles: column-level grants so stripe_customer_id is only
--    readable/writable by service_role (Edge Functions)
-- 3. upsert_profile: length caps on user-supplied fields
-- ============================================

-- ---------- 1. append_origin hardening ----------

-- Rate-limit log. RLS enabled with no policies = clients cannot touch it;
-- only SECURITY DEFINER functions and service_role can.
CREATE TABLE IF NOT EXISTS public.origin_append_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  cultivar_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.origin_append_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS origin_append_log_user_time
  ON public.origin_append_log (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.append_origin(
  p_cultivar_name TEXT,
  p_origin JSONB,
  p_ip TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id BIGINT;
  v_origins JSONB;
  v_recent INT;
  v_clean JSONB;
  v_structured JSONB := NULL;
  v_formula JSONB := NULL;
  v_sources JSONB := NULL;
  v_citations JSONB := NULL;
  v_s JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_origin IS NULL OR jsonb_typeof(p_origin) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid origin payload');
  END IF;

  -- Per-user rate limit: max 30 appends per hour
  SELECT count(*) INTO v_recent
    FROM public.origin_append_log
   WHERE user_id = auth.uid()
     AND created_at > now() - interval '1 hour';
  IF v_recent >= 30 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded');
  END IF;

  SELECT id, COALESCE(origins, '[]'::jsonb)
    INTO v_id, v_origins
    FROM cultivars
   WHERE cultivar_name = p_cultivar_name
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cultivar not found');
  END IF;

  -- Per-cultivar cap to prevent unbounded growth
  IF jsonb_array_length(v_origins) >= 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Origin limit reached for this cultivar');
  END IF;

  -- Rebuild the origin object from a whitelist of keys.
  -- Client-supplied trust / trustClass / source_type / author / votes are
  -- ignored and forced server-side.

  IF jsonb_typeof(p_origin->'formula') = 'object' THEN
    v_formula := jsonb_build_object(
      'parentA', left(COALESCE(p_origin->'formula'->>'parentA', ''), 200),
      'parentB', left(COALESCE(p_origin->'formula'->>'parentB', ''), 200)
    );
  END IF;

  IF p_origin->>'_type' = 'formula' THEN
    IF v_formula IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid formula payload');
    END IF;
    v_clean := jsonb_build_object('_type', 'formula', 'formula', v_formula);
  ELSE
    v_s := p_origin->'structured';
    IF jsonb_typeof(v_s) = 'object' THEN
      v_structured := jsonb_strip_nulls(jsonb_build_object(
        'origin_type', left(v_s->>'origin_type', 20),
        'notes', left(v_s->>'notes', 4000),
        'author_name', left(v_s->>'author_name', 300),
        'publication_year', CASE WHEN jsonb_typeof(v_s->'publication_year') = 'number' THEN v_s->'publication_year' END,
        'collector', left(v_s->>'collector', 300),
        'collection_year', CASE WHEN jsonb_typeof(v_s->'collection_year') = 'number' THEN v_s->'collection_year' END,
        'type_locality', left(v_s->>'type_locality', 500),
        'known_habitats', left(v_s->>'known_habitats', 1000),
        'namer', left(v_s->>'namer', 300),
        'naming_year', CASE WHEN jsonb_typeof(v_s->'naming_year') = 'number' THEN v_s->'naming_year' END,
        'breeder', left(v_s->>'breeder', 300),
        'sowing_date', left(v_s->>'sowing_date', 50),
        'species_subcategory', left(v_s->>'species_subcategory', 20)
      ));
      IF jsonb_typeof(v_s->'formula') = 'object' THEN
        v_structured := v_structured || jsonb_build_object('formula', jsonb_build_object(
          'parentA', left(COALESCE(v_s->'formula'->>'parentA', ''), 200),
          'parentB', left(COALESCE(v_s->'formula'->>'parentB', ''), 200)
        ));
      END IF;
      IF jsonb_typeof(v_s->'citation_links') = 'array' THEN
        SELECT jsonb_agg(jsonb_build_object('url', left(elem->>'url', 500)))
          INTO v_citations
          FROM (
            SELECT value AS elem
              FROM jsonb_array_elements(v_s->'citation_links')
             LIMIT 10
          ) c
         WHERE elem->>'url' ~* '^https?://';
        IF v_citations IS NOT NULL THEN
          v_structured := v_structured || jsonb_build_object('citation_links', v_citations);
        END IF;
      END IF;
      IF v_structured = '{}'::jsonb THEN
        v_structured := NULL;
      END IF;
    END IF;

    IF jsonb_typeof(p_origin->'sources') = 'array' THEN
      SELECT jsonb_agg(jsonb_build_object(
               'icon', left(COALESCE(elem->>'icon', ''), 8),
               'text', left(COALESCE(elem->>'text', ''), 500)
             ))
        INTO v_sources
        FROM (
          SELECT value AS elem
            FROM jsonb_array_elements(p_origin->'sources')
           LIMIT 10
        ) srcs;
    END IF;

    v_clean := jsonb_strip_nulls(jsonb_build_object(
      'trust', 25,
      'trustClass', 'trust--low',
      'body', left(COALESCE(p_origin->>'body', ''), 4000),
      'structured', v_structured,
      'source_type', 'manual',
      'sources', v_sources,
      'author', jsonb_build_object(
        'isAI', false,
        'name', 'User',
        'date', to_char(now(), 'YYYY-MM-DD')
      ),
      'votes', jsonb_build_object('agree', 0, 'disagree', 0)
    ));
  END IF;

  UPDATE cultivars
     SET origins = v_origins || jsonb_build_array(v_clean),
         origin_added_ip = left(p_ip, 64)
   WHERE id = v_id;

  INSERT INTO public.origin_append_log (user_id, cultivar_id)
  VALUES (auth.uid(), v_id);

  -- Opportunistic cleanup of old rate-limit rows
  DELETE FROM public.origin_append_log
   WHERE created_at < now() - interval '2 days';

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.append_origin(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_origin(TEXT, JSONB, TEXT) TO authenticated;

-- ---------- 2. profiles: protect stripe_customer_id ----------
-- Clients read profiles via explicit column lists; all writes go through
-- the SECURITY DEFINER upsert_profile RPC. Edge Functions use service_role
-- (unaffected by these grants).

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, bio, sns_instagram, sns_twitter, username, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

-- ---------- 3. upsert_profile: length caps ----------
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
    left(COALESCE(p_display_name, ''), 100),
    left(COALESCE(p_bio, ''), 1000),
    left(COALESCE(p_sns_instagram, ''), 100),
    left(COALESCE(p_sns_twitter, ''), 100),
    left(COALESCE(p_avatar_url, ''), 500)
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(left(p_display_name, 100), profiles.display_name),
    bio = COALESCE(left(p_bio, 1000), profiles.bio),
    sns_instagram = COALESCE(left(p_sns_instagram, 100), profiles.sns_instagram),
    sns_twitter = COALESCE(left(p_sns_twitter, 100), profiles.sns_twitter),
    avatar_url = COALESCE(left(p_avatar_url, 500), profiles.avatar_url),
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_profile(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
