-- Phase 6B / Part 1 — rate limiting for the LOCAL spelling submission demo
--
-- This is a learning exercise, NOT a production anti-spam solution.
-- A single quota is shared by all local-development submissions:
-- 5 validated POST requests per fixed UTC minute.
--
-- The durable counter lives inside PostgreSQL. An atomic UPSERT ensures
-- simultaneous requests cannot exceed the allowance due to a race condition.
-- No client IP address, email, cookie, or user identifier is stored.
--
-- Run once in the SAME Supabase project's SQL Editor.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.spelling_rate_limits (
  scope text NOT NULL,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (scope, window_start)
);
ALTER TABLE private.spelling_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.spelling_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON private.spelling_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_local_spelling_quota()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  now_epoch bigint := floor(extract(epoch FROM clock_timestamp()))::bigint;
  bucket_start timestamptz := to_timestamp((now_epoch / 60) * 60);
  current_attempts integer;
  retry_seconds integer := 60 - (now_epoch % 60)::integer;
BEGIN
  INSERT INTO private.spelling_rate_limits (scope, window_start, attempts)
  VALUES ('local-spelling-demo', bucket_start, 1)
  ON CONFLICT (scope, window_start)
  DO UPDATE SET attempts = LEAST(spelling_rate_limits.attempts + 1, 6)
  RETURNING attempts INTO current_attempts;

  RETURN pg_catalog.jsonb_build_object(
    'allowed', current_attempts <= 5,
    'limit', 5,
    'remaining', GREATEST(0, 5 - current_attempts),
    'retry_after_seconds', retry_seconds
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_local_spelling_quota() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_local_spelling_quota() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_local_spelling_quota() TO service_role;

NOTIFY pgrst, 'reload schema';

-- Safe read-only inspection query for later (never run the function just
-- to check its settings: calling it deliberately CONSUMES one allowance).
-- SELECT window_start, attempts FROM private.spelling_rate_limits
-- ORDER BY window_start DESC LIMIT 5;

-- OPTIONAL after the experiment: delete old counters (not spelling records):
-- DELETE FROM private.spelling_rate_limits
-- WHERE window_start < now() - interval '1 day';
