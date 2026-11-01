-- Minimal spelling-suggestion backend.
-- Run in your EXISTING Supabase project, not a new one.
-- This does not remove or modify your old experimental data.

CREATE TABLE IF NOT EXISTS public.spelling_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_word text NOT NULL,
  suggested_spelling text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.spelling_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.spelling_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.spelling_submissions TO service_role;

-- Small anti-spam quota: five submissions per client per minute.
-- The server passes a HMAC hash of the Vercel-provided client IP.
-- No raw IP address is stored in PostgreSQL.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.spelling_submission_limits (
  scope_hash text NOT NULL,
  minute_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  PRIMARY KEY (scope_hash, minute_start)
);
ALTER TABLE private.spelling_submission_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.spelling_submission_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.spelling_submission_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_spelling_submission_quota(p_scope_hash text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  bucket timestamptz := pg_catalog.date_trunc('minute', pg_catalog.clock_timestamp());
  count_now integer;
  retry_seconds integer;
BEGIN
  IF p_scope_hash IS NULL OR p_scope_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN pg_catalog.jsonb_build_object('allowed', false, 'retry_after_seconds', 60);
  END IF;

  INSERT INTO private.spelling_submission_limits AS q (scope_hash, minute_start, attempts)
  VALUES (p_scope_hash, bucket, 1)
  ON CONFLICT (scope_hash, minute_start)
  DO UPDATE SET attempts = LEAST(q.attempts + 1, 6)
  RETURNING attempts INTO count_now;

  -- No scheduled jobs; remove old anonymous counters during future requests.
  DELETE FROM private.spelling_submission_limits
  WHERE minute_start < pg_catalog.clock_timestamp() - INTERVAL '2 days';

  retry_seconds := GREATEST(
    1,
    CEIL(EXTRACT(EPOCH FROM (bucket + INTERVAL '1 minute' - pg_catalog.clock_timestamp())))::integer
  );

  RETURN pg_catalog.jsonb_build_object(
    'allowed', count_now <= 5,
    'retry_after_seconds', retry_seconds
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_spelling_submission_quota(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_spelling_submission_quota(text)
TO service_role;

NOTIFY pgrst, 'reload schema';

-- Read submissions in Supabase SQL Editor:
-- SELECT id, original_word, suggested_spelling, created_at
-- FROM public.spelling_submissions ORDER BY id DESC LIMIT 20;
