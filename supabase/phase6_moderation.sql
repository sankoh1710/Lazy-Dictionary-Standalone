-- PHASE 6A: Local moderation schema. Run once in Supabase SQL Editor.
-- The dashboard currently treats all records as raw submissions; this step
-- adds a moderation decision to each row, not a public approved-spellings feed.
--
-- Existing experiment rows will be marked pending for review.
ALTER TABLE public.spelling_submissions
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Add a constraint once, in a repeatable way.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'spelling_submissions_moderation_status_check'
      AND conrelid = 'public.spelling_submissions'::regclass
  ) THEN
    ALTER TABLE public.spelling_submissions
      ADD CONSTRAINT spelling_submissions_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END
$$;

ALTER TABLE public.spelling_submissions ENABLE ROW LEVEL SECURITY;

-- These are test submissions handled only by our server.
-- Do not give browser roles direct access to the table.
REVOKE ALL ON TABLE public.spelling_submissions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.spelling_submissions TO service_role;

NOTIFY pgrst, 'reload schema';

-- Sanity check:
-- SELECT id, original_word, suggested_spelling, moderation_status, reviewed_at
-- FROM public.spelling_submissions ORDER BY id DESC LIMIT 20;
