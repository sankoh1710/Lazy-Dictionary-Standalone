-- Public beta preparation: IP-derived, HMAC-salted quota scopes.
-- Requires a trusted proxy (Vercel) and server-side HMAC only.
-- No raw IP address is stored in PostgreSQL.
-- Still requires Cloudflare Turnstile, monitoring and staging tests.
--
-- DO NOT enable public writes until this migration has been applied.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.spelling_public_limits (
  scope_hash text NOT NULL,
  window_kind text NOT NULL CHECK (window_kind IN ('minute', 'hour')),
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (scope_hash, window_kind, window_start)
);
ALTER TABLE private.spelling_public_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.spelling_public_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON private.spelling_public_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_public_spelling_quota(p_scope_hash text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  epoch_now bigint := pg_catalog.floor(pg_catalog.extract(epoch FROM pg_catalog.clock_timestamp()))::bigint;
  minute_start timestamptz := pg_catalog.to_timestamp((epoch_now / 60) * 60);
  hour_start timestamptz := pg_catalog.to_timestamp((epoch_now / 3600) * 3600);
  minute_count integer;
  hour_count integer;
  wait_seconds integer;
BEGIN
  IF p_scope_hash IS NULL OR p_scope_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN pg_catalog.jsonb_build_object('allowed', false, 'retry_after_seconds', 3600);
  END IF;

  INSERT INTO private.spelling_public_limits (scope_hash, window_kind, window_start, attempts)
  VALUES (p_scope_hash, 'minute', minute_start, 1)
  ON CONFLICT (scope_hash, window_kind, window_start)
  DO UPDATE SET attempts = LEAST(private.spelling_public_limits.attempts + 1, 100)
  RETURNING attempts INTO minute_count;

  INSERT INTO private.spelling_public_limits (scope_hash, window_kind, window_start, attempts)
  VALUES (p_scope_hash, 'hour', hour_start, 1)
  ON CONFLICT (scope_hash, window_kind, window_start)
  DO UPDATE SET attempts = LEAST(private.spelling_public_limits.attempts + 1, 100)
  RETURNING attempts INTO hour_count;

  wait_seconds := CASE
    WHEN hour_count > 20 THEN (3600 - epoch_now % 3600)::integer
    WHEN minute_count > 4 THEN (60 - epoch_now % 60)::integer
    ELSE 0
  END;

  RETURN pg_catalog.jsonb_build_object(
    'allowed', (minute_count <= 4 AND hour_count <= 20),
    'retry_after_seconds', wait_seconds
  );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_public_spelling_quota(text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_spelling_quota(text)
TO service_role;

NOTIFY pgrst, 'reload schema';

-- Safe read-only inspection; scopes are pseudonymous hashes.
-- SELECT window_kind, window_start, attempts
-- FROM private.spelling_public_limits
-- ORDER BY window_start DESC LIMIT 15;
--
-- Recommended periodic retention cleanup, to be scheduled before launch:
-- DELETE FROM private.spelling_public_limits WHERE window_start < now() - interval '2 days';
