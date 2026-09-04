-- AI re-research requests (owner decision 2026-09-05):
-- registration gets one free AI run; afterwards users REQUEST a re-run,
-- the admin approves or rejects, and approval triggers the research.
CREATE TABLE IF NOT EXISTS public.research_requests (
  id BIGSERIAL PRIMARY KEY,
  cultivar_id BIGINT REFERENCES public.cultivars(id) ON DELETE CASCADE,
  cultivar_name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | done | failed
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID
);
CREATE INDEX IF NOT EXISTS research_requests_status_idx ON public.research_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS research_requests_cultivar_idx ON public.research_requests (cultivar_id, created_at DESC);

ALTER TABLE public.research_requests ENABLE ROW LEVEL SECURITY;

-- Anyone signed in can file a request for themselves (one open request per cultivar enforced below)
CREATE POLICY "Users insert own research_requests" ON public.research_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Requesters see their own; everyone signed in can see whether a cultivar has an open request
CREATE POLICY "Users read research_requests" ON public.research_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin update research_requests" ON public.research_requests
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete research_requests" ON public.research_requests
  FOR DELETE USING (public.is_admin());

-- One open (pending/approved) request per cultivar
CREATE UNIQUE INDEX IF NOT EXISTS research_requests_one_open
  ON public.research_requests (cultivar_id) WHERE status IN ('pending', 'approved');

-- Requesters: at most 3 open requests at a time (cheap abuse guard)
CREATE OR REPLACE FUNCTION public.research_requests_guard() RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM public.research_requests WHERE user_id = NEW.user_id AND status = 'pending') >= 3 THEN
    RAISE EXCEPTION 'too many open requests';
  END IF;
  IF NEW.reason IS NOT NULL AND length(NEW.reason) > 500 THEN
    RAISE EXCEPTION 'reason too long';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS research_requests_guard_trg ON public.research_requests;
CREATE TRIGGER research_requests_guard_trg BEFORE INSERT ON public.research_requests
  FOR EACH ROW EXECUTE FUNCTION public.research_requests_guard();

GRANT SELECT, INSERT ON public.research_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.research_requests_id_seq TO authenticated;
