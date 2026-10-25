-- Phase 5: Compute analytics in PostgreSQL, rather than downloading
-- every row to the browser or counting a limited 20-row page.
--
-- Run in Supabase SQL Editor using the same project as your spelling_submissions
-- table. The function is read-only, returns a single JSON object, and is
-- callable only by service_role (used by our local server-side secret key).

CREATE OR REPLACE FUNCTION public.spelling_analytics()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH base AS (
    SELECT original_word, suggested_spelling, created_at
    FROM public.spelling_submissions
  ),
  totals AS (
    SELECT
      COUNT(*)::integer AS total_submissions,
      COUNT(DISTINCT original_word)::integer AS unique_words,
      COUNT(DISTINCT (original_word, suggested_spelling))::integer AS unique_alternatives
    FROM base
  ),
  word_counts AS (
    SELECT
      original_word,
      COUNT(*)::integer AS submissions,
      COUNT(DISTINCT suggested_spelling)::integer AS unique_spellings
    FROM base
    GROUP BY original_word
    ORDER BY submissions DESC, original_word
    LIMIT 10
  ),
  alternative_counts AS (
    SELECT
      original_word,
      suggested_spelling,
      COUNT(*)::integer AS submissions
    FROM base
    GROUP BY original_word, suggested_spelling
    ORDER BY submissions DESC, original_word, suggested_spelling
    LIMIT 10
  ),
  daily_counts AS (
    SELECT
      (created_at AT TIME ZONE 'UTC')::date AS day,
      COUNT(*)::integer AS submissions
    FROM base
    WHERE created_at >= (now() - INTERVAL '13 days')
    GROUP BY (created_at AT TIME ZONE 'UTC')::date
    ORDER BY day ASC
  )
  SELECT jsonb_build_object(
    'total_submissions', (SELECT total_submissions FROM totals),
    'unique_words', (SELECT unique_words FROM totals),
    'unique_alternatives', (SELECT unique_alternatives FROM totals),
    'top_words', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'word', original_word,
          'submissions', submissions,
          'unique_spellings', unique_spellings
        ) ORDER BY submissions DESC, original_word
      ) FROM word_counts),
      '[]'::jsonb
    ),
    'top_spellings', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'original_word', original_word,
          'suggested_spelling', suggested_spelling,
          'submissions', submissions
        ) ORDER BY submissions DESC, original_word, suggested_spelling
      ) FROM alternative_counts),
      '[]'::jsonb
    ),
    'daily_submissions', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'day', to_char(day, 'YYYY-MM-DD'),
          'submissions', submissions
        ) ORDER BY day ASC
      ) FROM daily_counts),
      '[]'::jsonb
    )
  );
$$;

-- PostgreSQL/Supabase normally allow function execution to PUBLIC by default.
-- Restrict it to the server-side service role. Do not grant to anon/authenticated.
REVOKE ALL ON FUNCTION public.spelling_analytics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.spelling_analytics() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spelling_analytics() TO service_role;

-- Help the Supabase Data API discover the new RPC immediately.
NOTIFY pgrst, 'reload schema';

-- Optional SQL Editor sanity check; the result is ONE JSON object:
-- SELECT public.spelling_analytics();
