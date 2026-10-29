-- Phase 6B / Part 2: auditable moderation transactions (LOCAL TESTING ONLY).
-- Run in the same Supabase SQL Editor where Phase 6A was installed.
--
-- An UPDATE/DELETE and its audit INSERT happen in ONE PostgreSQL transaction
-- inside admin_moderate_spelling(). If logging fails, the change rolls back.
-- Earlier moderation decisions cannot be reconstructed retroactively.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE TABLE IF NOT EXISTS private.spelling_moderation_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_id bigint NOT NULL,
  original_word text NOT NULL,
  suggested_spelling text NOT NULL,
  actor_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected', 'pending', 'deleted')),
  previous_status text NOT NULL CHECK (previous_status IN ('pending', 'approved', 'rejected')),
  new_status text CHECK (new_status IS NULL OR new_status IN ('pending', 'approved', 'rejected')),
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Do NOT use a foreign key to spelling_submissions: audit rows must remain
-- after a spelling submission itself is deleted.
ALTER TABLE private.spelling_moderation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.spelling_moderation_audit FROM PUBLIC, anon, authenticated;
-- Read and append are enough; the service role should not need UPDATE/DELETE.
GRANT SELECT, INSERT ON private.spelling_moderation_audit TO service_role;

CREATE OR REPLACE FUNCTION public.admin_moderate_spelling(
  p_id bigint,
  p_action text,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  before_row public.spelling_submissions%ROWTYPE;
  after_row public.spelling_submissions%ROWTYPE;
  log_id bigint;
  target_status text;
BEGIN
  IF p_id IS NULL OR p_id < 1 OR p_actor_id IS NULL OR
     p_action IS NULL OR p_action NOT IN ('approved', 'rejected', 'pending', 'deleted') THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- Row lock serializes simultaneous admin decisions for the same submission.
  SELECT * INTO before_row
  FROM public.spelling_submissions
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF p_action = 'deleted' THEN
    DELETE FROM public.spelling_submissions
    WHERE id = p_id
    RETURNING * INTO after_row;
    target_status := NULL;
  ELSE
    IF before_row.moderation_status = p_action THEN
      RETURN pg_catalog.jsonb_build_object('ok', false, 'error', 'already_in_state');
    END IF;

    UPDATE public.spelling_submissions
       SET moderation_status = p_action,
           reviewed_at = CASE WHEN p_action = 'pending' THEN NULL ELSE now() END
     WHERE id = p_id
     RETURNING * INTO after_row;

    target_status := p_action;
  END IF;

  -- Same database transaction as the modification. Missing permissions,
  -- violated constraints, or insert failures roll back the moderation action.
  INSERT INTO private.spelling_moderation_audit (
    submission_id, original_word, suggested_spelling, actor_id,
    action, previous_status, new_status
  )
  VALUES (
    before_row.id, before_row.original_word, before_row.suggested_spelling,
    p_actor_id, p_action, before_row.moderation_status, target_status
  )
  RETURNING id INTO log_id;

  RETURN pg_catalog.jsonb_build_object(
    'ok', true,
    'audit_id', log_id,
    'record', pg_catalog.jsonb_build_object(
      'id', before_row.id,
      'original_word', before_row.original_word,
      'suggested_spelling', before_row.suggested_spelling,
      'moderation_status', after_row.moderation_status,
      'reviewed_at', after_row.reviewed_at,
      'deleted', p_action = 'deleted'
    )
  );
END;
$$;

-- Exposed-schema RPCs need explicit permission controls.
REVOKE ALL ON FUNCTION public.admin_moderate_spelling(bigint, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_spelling(bigint, text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.list_spelling_audit_events(p_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT pg_catalog.jsonb_build_object(
    'events', COALESCE(
      (SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', a.id,
          'submission_id', a.submission_id,
          'original_word', a.original_word,
          'suggested_spelling', a.suggested_spelling,
          'actor_id', a.actor_id,
          'action', a.action,
          'previous_status', a.previous_status,
          'new_status', a.new_status,
          'changed_at', a.changed_at
        ) ORDER BY a.id DESC
      )
      FROM (
        SELECT *
        FROM private.spelling_moderation_audit
        ORDER BY id DESC
        LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50)
      ) AS a),
      '[]'::jsonb
    ),
    'total', (SELECT COUNT(*) FROM private.spelling_moderation_audit)
  );
$$;

REVOKE ALL ON FUNCTION public.list_spelling_audit_events(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_spelling_audit_events(integer)
  TO service_role;

NOTIFY pgrst, 'reload schema';

-- SAFE read-only check: initially 0 events until you make a new decision.
-- SELECT id, submission_id, actor_id, action, previous_status, new_status, changed_at
-- FROM private.spelling_moderation_audit ORDER BY id DESC LIMIT 20;
