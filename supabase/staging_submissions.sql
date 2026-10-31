-- Run only in a NEW, SEPARATE Supabase STAGING project.
-- Do NOT run in your live Lazy Dictionary Supabase project.
--
-- Minimal staging schema for the public submission endpoint:
-- Visitors submit a word + alternative spelling as pending.
-- The public quota RPC is installed separately from
-- supabase/public_submission_quota.sql.

CREATE TABLE IF NOT EXISTS public.spelling_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_word text NOT NULL,
  suggested_spelling text NOT NULL,
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT staging_word_length_check
    CHECK (
      length(original_word) BETWEEN 1 AND 60
      AND length(suggested_spelling) BETWEEN 1 AND 60
    )
);

ALTER TABLE public.spelling_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.spelling_submissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.spelling_submissions TO service_role;

NOTIFY pgrst, 'reload schema';

-- Run separately afterwards:
-- supabase/public_submission_quota.sql
--
-- Verify saved test submissions using Supabase SQL Editor:
-- SELECT id, original_word, suggested_spelling, moderation_status, created_at
-- FROM public.spelling_submissions ORDER BY id DESC LIMIT 20;
