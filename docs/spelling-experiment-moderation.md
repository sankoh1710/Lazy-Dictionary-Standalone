# Phase 6A — Local Admin Authentication and Moderation

You already successfully:
1. Saved React spelling suggestions to Supabase.
2. Retrieved and filtered records through a Vercel API.
3. Calculated statistics in PostgreSQL and displayed them in React.

Phase 6A adds **who may manage data** (authentication + authorization),
**what they can do** (approve, reject, reset, delete), and **protection
against direct browser access** to the database table.

The experiment is intentionally LOCAL ONLY. It is not a public launch.

## Step 1 — Run the database migration

In the same Supabase project used for Lazy Dictionary, open SQL Editor and
run the complete file:

`supabase/phase6_moderation.sql`

This adds:
- `moderation_status`: pending / approved / rejected, initially pending.
- `reviewed_at`: time a record was approved/rejected.
- A CHECK constraint preventing invalid moderation statuses.
- Revokes direct `anon` and `authenticated` role access to the table.
- Keeps server-only `service_role` access.

This migration is safe to re-run. It does not erase test data.

Run this to verify it:

```sql
SELECT id, original_word, suggested_spelling, moderation_status, reviewed_at
FROM public.spelling_submissions
ORDER BY id DESC
LIMIT 10;
```

Expect previously saved records to have `moderation_status = 'pending'`.

## Step 2 — Create your actual admin identity

Your GitHub login to the Supabase Dashboard is NOT automatically a user in
Supabase Auth. Create a dedicated Auth user to manage Lazy Dictionary:

1. Open **Supabase → Authentication → Users**.
2. Select **Add user**. Use the Dashboard's create/invite flow to give
   the account an email and password (complete verification if necessary).
3. Copy the new Auth user's **User ID** (UUID). This is the identity our
   backend will allow to moderate. Do **not** use the email as an admin check.

Do not use your Supabase Dashboard password for this experiment if you
can avoid it; create a separate, strong password for the Auth test user.

## Step 3 — Configure two more Development environment variables

In **Supabase → Settings → API Keys**, find the new
`sb_publishable_...` key (safe to publish, but we use it server-side here).
Your `sb_secret_...` key is DIFFERENT and stays private on the backend.

Add these in your local ignored `.env.local` file:

```dotenv
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PROJECT_KEY
SUPABASE_ADMIN_USER_ID=YOUR_AUTH_USER_UUID
```

Keep the three existing settings:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_SECRET_KEY
SPELLING_SUBMISSIONS_ENABLED=true
```

If you use Vercel CLI Development environment variables, add the same two
**names and values under Development only**, not Preview/Production:

```
SUPABASE_PUBLISHABLE_KEY
SUPABASE_ADMIN_USER_ID
```

Then pull the development configuration:

```powershell
npx vercel pull --environment=development
```

Never post your secret key, Auth token, password, or entire .env.local file
in chat or GitHub. Your UUID is not a password but should be kept in your
configuration rather than hardcoding admin identity into the frontend.

## Step 4 — Run the updated local project

```powershell
git switch feature/spelling-experiment-phase1
git pull origin feature/spelling-experiment-phase1
npx vercel dev
```

Open the localhost address shown by `vercel dev`. Under **Spelling
Experiment**, you should now see **Admin moderation**.

Try visiting `http://localhost:YOUR_PORT/api/admin-submissions` BEFORE
signing in. It should respond with **401 Admin login required**.
That demonstrates the difference between a normal GET endpoint and
an authenticated one.

## Step 5 — Sign in and review

Use the email + password of the **Supabase Auth** user you created.
Only the exact allowlisted `SUPABASE_ADMIN_USER_ID` is accepted by the API.

After sign in, the admin panel shows up to 30 rows at a time, filtered by:
- Pending (default)
- Approved
- Rejected
- All

Test with your existing `psychology → sykoloji` submission:

1. Select **Pending**.
2. Find your test submission.
3. Click **Approve**.
4. Switch to **Approved** and confirm that the record appears.
5. Click **Reject** to change its status again.
6. Use **Set pending** to restore the test record.

If you want to test DELETE, use a disposable submission that you are
comfortable losing permanently. The interface asks for confirmation.
Deletion is NOT reversible.

Do not mistake approving a record for publishing it: this phase updates its
moderation metadata but does not introduce a public approved-words feed.

## Step 6 — Observe HTTP requests and SQL

Open Chrome DevTools → Network → Fetch/XHR.

- `POST /api/admin-login`: submits credentials to our local server;
  Supabase Auth authenticates, then our server checks the user UUID.
- `GET /api/admin-submissions?status=pending`: requires a Bearer user JWT.
- `PATCH /api/admin-submissions`: modifies one row's status and review time.
- `DELETE /api/admin-submissions`: deletes one specific confirmed test row.

**Do not share Network headers/payload screenshots that show access tokens or
passwords.** If sharing screenshots, hide the Authorization header and
authentication payload. The token is not the same as a harmless record ID.

Compare with:

```sql
SELECT moderation_status, COUNT(*) AS submissions
FROM public.spelling_submissions
GROUP BY moderation_status
ORDER BY moderation_status;
```

Practice setting and reversing a review inside a transaction:

```sql
BEGIN;
UPDATE public.spelling_submissions
SET moderation_status = 'approved', reviewed_at = now()
WHERE original_word = 'psychology'
RETURNING id, moderation_status, reviewed_at;
ROLLBACK;
```

## Design and security notes

- `api/admin-login.ts` handles temporary login; returns an access token
  but not a refresh token.
- `src/server/adminAuth.ts` verifies the token live against
  Supabase Auth and checks the UUID against the server-side allowlist.
- `api/admin-submissions.ts` performs the SELECT/PATCH/DELETE **only
  after** authorization, using the server-side Supabase secret key.
- The React admin login token is memory-only and disappears when the
  page is refreshed or closed. Sign in again after refresh or expiry.
- No direct public policy allows reading/modifying the table using
  a publishable key.
- Production/Preview admin endpoints are disabled. API also checks
  a loopback hostname. Do not expose `vercel dev` on a public network.
- Existing analytics still count ALL test submissions, regardless of
  moderation status. “Approved” is not synonymous with a unique human.
- This does not yet implement production-ready rate limiting, CSRF
  defense for cookie-based sessions, comprehensive audit logs,
  persistent admin sessions, or real public moderation.
- Do not launch public submissions until those controls are in place.

## Verification checklist

- [ ] Migration applied; every prior row displays a status.
- [ ] Auth test user created and allowlisted by UUID.
- [ ] Unauthenticated admin endpoint returns 401.
- [ ] Correct Auth user can sign in, other Auth users cannot moderate.
- [ ] Approve/reject/pending actions persist after refresh.
- [ ] DELETE requires confirmation and affects exactly one disposable row.
- [ ] Admin API is inaccessible in Vercel Preview and Production.
- [ ] `pnpm typecheck` and `pnpm build` pass.
