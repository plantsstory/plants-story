-- Error logging table for frontend error monitoring
CREATE TABLE IF NOT EXISTS error_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message text NOT NULL,
  source text,
  lineno integer,
  colno integer,
  stack text,
  url text,
  user_agent text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Index for querying recent errors
CREATE INDEX idx_error_logs_created_at ON error_logs (created_at DESC);

-- RLS: allow anonymous inserts (errors happen before login too)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can insert errors
CREATE POLICY "Anyone can insert error logs"
  ON error_logs FOR INSERT
  WITH CHECK (true);

-- Only admins can read error logs
CREATE POLICY "Admins can read error logs"
  ON error_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete error logs
CREATE POLICY "Admins can delete error logs"
  ON error_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Auto-cleanup: delete logs older than 30 days (run via pg_cron or manual)
-- SELECT cron.schedule('cleanup-error-logs', '0 3 * * *', $$DELETE FROM error_logs WHERE created_at < now() - interval '30 days'$$);

-- RPC for inserting error logs (allows anon key usage)
CREATE OR REPLACE FUNCTION log_client_error(
  p_message text,
  p_source text DEFAULT NULL,
  p_lineno integer DEFAULT NULL,
  p_colno integer DEFAULT NULL,
  p_stack text DEFAULT NULL,
  p_url text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO error_logs (message, source, lineno, colno, stack, url, user_agent, user_id)
  VALUES (p_message, p_source, p_lineno, p_colno, p_stack, p_url, p_user_agent, auth.uid());
END;
$$;
