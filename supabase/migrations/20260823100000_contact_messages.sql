-- ============================================
-- Contact messages: real backend for the contact form
-- (previously the form showed a fake success toast and discarded input)
-- ============================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  user_id UUID DEFAULT auth.uid(),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Admin can read and update (resolve) messages
CREATE POLICY "Admin read contact_messages" ON public.contact_messages
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin update contact_messages" ON public.contact_messages
  FOR UPDATE USING (public.is_admin());

-- Inserts go only through the RPC below (validation + rate limit)
CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_name TEXT,
  p_email TEXT,
  p_category TEXT,
  p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent INT;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 OR length(p_name) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid name');
  END IF;
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(p_email) > 255 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email');
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 OR length(p_message) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid message');
  END IF;
  IF p_category IS NULL OR p_category NOT IN ('general', 'copyright', 'deletion', 'bug') THEN
    p_category := 'general';
  END IF;

  -- Rate limit: max 5 messages per hour per email address
  SELECT count(*) INTO v_recent
  FROM contact_messages
  WHERE email = p_email AND created_at > now() - interval '1 hour';
  IF v_recent >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rate limited');
  END IF;

  INSERT INTO contact_messages (name, email, category, message, user_id)
  VALUES (trim(p_name), p_email, p_category, trim(p_message), auth.uid());

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_contact_message(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
