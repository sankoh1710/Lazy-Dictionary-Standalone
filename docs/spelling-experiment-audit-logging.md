# Phase 6B, Part 2 — Moderation audit logging

You previously verified:
- Supabase Auth admin sign-in and authorization.
- Approving `psychology → sykoloji`.
- The Approved filter reflects the updated record.
- A local 5-submissions-per-minute limit produces a blocked request.

Now we'll answer a different database question: **Who changed a record,
what did they change, and when?**

## 1. Install the SQL

In your existing Supabase project's SQL Editor, execute the full contents:

```
supabase/phase6b_audit_logging.sql
```

This creates:
- `private.spelling_moderation_audit` — a historical, append-only table
  for decisions taken through the application.
- `public.admin_moderate_spelling(p_id, p_action, p_actor_id)` — a
  restricted RPC that locks one spelling submission, updates or deletes
  it, then appends an audit event in the SAME PostgreSQL transaction.
- `public.list_spelling_audit_events(p_limit)` — a restricted read-only
  RPC that returns recent audit events.

The private table is deliberately not exposed to browser API keys.
The two public-schema RPCs revoke EXECUTE from PUBLIC, anon, and
authenticated; only the server-side service_role may call them.

Existing submissions are not deleted, and existing moderation statuses
remain unchanged. **Audit history begins when you install this feature.**
Your previous approval of `psychology` will not magically appear as an
old event; PostgreSQL cannot reconstruct history that was never recorded.

## 2. Update your project locally

Stop Vercel Dev with Ctrl+C, then:

```powershell
git switch feature/spelling-experiment-phase1
git pull origin feature/spelling-experiment-phase1
npx vercel dev
```

Use the localhost URL in the terminal. No new environment variables.

In Spelling Experiment → Admin moderation, sign in with the SAME Supabase
Auth admin account you already configured. Under the moderation controls,
you should now find **Moderation history**.

If you have not run the SQL yet, edits and deletions will intentionally
fail instead of silently modifying data without an audit trail.

## 3. Test an approval, then verify it

Choose a disposable PENDING spelling, such as
`knowledge → nolej` if that test row still exists.

Click Approve. The row should move to Approved, and the history panel
should show:

- `submission_id`: the ID of the updated submission.
- `original_word`, `suggested_spelling`: snapshot of the spelling.
- `previous_status`: pending.
- `new_status`: approved.
- `actor_id`: the allowlisted Supabase Auth user's UUID (shortened in UI).
- `changed_at`: the moment the action was recorded.

Then change that SAME record from Approved → Rejected.
That creates a SECOND independent event instead of overwriting the
earlier record. The audit log is a HISTORY, whereas moderation_status
in the submissions table is the CURRENT STATE.

## 4. Verify using SQL

Compare the present state:

```sql
SELECT id, original_word, suggested_spelling,
       moderation_status, reviewed_at
FROM public.spelling_submissions
ORDER BY id DESC LIMIT 10;
```

With the recorded sequence of changes:

```sql
SELECT id, submission_id, original_word, suggested_spelling,
       actor_id, action, previous_status, new_status, changed_at
FROM private.spelling_moderation_audit
ORDER BY id DESC LIMIT 20;
```

View the number of audit events:

```sql
SELECT COUNT(*) AS audit_event_count
FROM private.spelling_moderation_audit;
```

**Do not share an Auth access token, Authorization header, password, or
secret key in a DevTools screenshot.** The audit table stores a user UUID,
not the access token.

## 5. Inspect the backend

Open Chrome DevTools → Network → Fetch/XHR:

- Clicking Approve sends `PATCH /api/admin-submissions`.
- The server checks your Auth token against Supabase Auth.
- The server checks that the authenticated user matches
  `SUPABASE_ADMIN_USER_ID` configured only on the server.
- The server calls `POST /rest/v1/rpc/admin_moderate_spelling`
  with that verified actor UUID. The browser does not choose the actor.
- The RPC modifies the submission and writes an audit row, atomically.
- Then the UI refreshes the admin list, the record viewer, analytics,
  and the audit history panel.

A successful PATCH should include `audit_id` in its response.

## 6. Optional delete experiment

Create a NEW disposable spelling suggestion. If rate limiting is still
enabled, follow its five-valid-submissions-per-minute local quota.

Approve or reject the test row and then delete it using
**Delete test record**. Deletion permanently removes the submission,
but the audit rows remain and still contain the old original word,
suggested spelling, actor ID, and the previous moderation status.

The audit table purposefully has **no foreign key** to the submissions
table, because deletion must not erase its history.

Do not delete your valuable records just to test the feature.

## Important security and integrity boundaries

- All mutation requests are still LOCAL ONLY, not deployed publicly.
- The admin must authenticate and be allowlisted; the browser's proposed
  actor name/ID is never trusted.
- The application uses one PostgreSQL transaction to make the
  moderation change and append the event. A logging error aborts both.
- The audit table grants service_role SELECT/INSERT, not UPDATE/DELETE.
- This is an **application-level audit trail**, not tamper-proof storage.
  Database owners, sufficiently privileged administrators, or other
  privileged write paths could alter data or bypass the audit RPC.
  Production would need stronger protections and independent logs.
- This version records admin approval, rejection, reset to pending,
  and deletion. It does NOT yet audit ordinary visitor submissions,
  failed sign-in attempts, or rate-limit requests.
- Data from before the migration is not backfilled into history.
- No secret keys or refresh tokens are added to client-side code.
- Do not use the SQL Editor to manually change status during the test
  and expect an event: that bypasses the application RPC.
- The admin panel shows the **30 latest audit events**; all history
  remains in PostgreSQL unless separately removed by a privileged actor.

## Test checklist

- [ ] Migration ran successfully in the correct Supabase project.
- [ ] Existing submission and moderation rows were preserved.
- [ ] A new approval adds an event with pending → approved.
- [ ] A new rejection adds a second event approved → rejected.
- [ ] The actor UUID matches the configured admin Auth user.
- [ ] The current submission status matches the last moderation action.
- [ ] Deleting a disposable row leaves its audit events intact.
- [ ] Calling the admin audit endpoint without login returns HTTP 401.
- [ ] `pnpm typecheck` and `pnpm build` pass.

This completes the audit-logging portion of Phase 6B. A future public
launch still requires abuse controls, monitoring, backups/retention
policies, and a hardened authorization/operation model.
