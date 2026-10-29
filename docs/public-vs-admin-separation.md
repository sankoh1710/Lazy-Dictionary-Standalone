# Public form / private administration separation (pre-release)

This is the next step after Phases 1–6B. The visitor experience now stays
simple, and the learning/administration tools have their own route.

## What changed

**Public homepage (`/`)**
- Existing Lazy Dictionary search and alphabet are unchanged.
- Visitors see only the two-input **Spelling Experiment** form.
- No database viewer, analytics, moderation buttons, or audit history
  are rendered on the public homepage.
- In local development (configured API), clicking **Submit spelling** saves a
  validated spelling with `moderation_status = 'pending'`.
- On Vercel Preview and Production, the existing write API remains DISABLED;
  the button says **Preview spelling** and clearly says nothing is saved.
  This is intentional until the public-release security work is complete.

**Admin workspace (`/admin`)**
- Has its own page; no public navigation link.
- On localhost, shows the Supabase Auth admin login screen first.
- Only after logging in with the allowlisted account does it show the
  moderation controls, analytics, and saved-record explorer.
- Authenticated audit history is shown within moderation.
- On deployed URLs, the admin page states the workspace is unavailable.
  The URL itself is not secret: the protected APIs enforce authorization.
- Static `admin/index.html` is generated for reliable deep linking, with
  `noindex,nofollow` and an EMPTY root to avoid homepage hydration errors.

**Server-side authorization**
- Both `/api/spelling-analytics` and `/api/spelling-records` now require
  a verified Supabase Auth access token with the allowed admin UUID,
  in addition to the existing local-development gate.
- `/api/admin-submissions` and `/api/admin-audit` remain protected as before.
- Server-only Supabase secret keys are NEVER transmitted to the browser.
- Public form submission still uses the shared rate limiter from Phase 6B.
- No production submission endpoint has been opened.

## How to test locally

Run in the project's VS Code terminal:

```powershell
git switch feature/spelling-experiment-phase1
git pull origin feature/spelling-experiment-phase1
npx vercel dev
```

1. Open the exact localhost URL from the CLI.
2. Verify homepage: only spelling inputs, action, and confirmation. No
   analytics, record viewer, or moderation controls.
3. Submit a disposable spelling once and confirm Supabase created a
   pending row. The existing local rate limit remains in effect.
4. Open `http://localhost:YOUR_PORT/admin`. You should see login.
5. BEFORE login, open `/api/spelling-records` directly (without a token).
   It should return HTTP 401 and NO records.
6. Sign in on `/admin` with your configured Supabase Auth administrator.
7. After sign-in, confirm moderation, analytics, and records appear.
8. Approve one disposable row; verify the admin statistics, records,
   and audit history refresh.
9. Refresh `/admin` (login must be required again; token is memory-only).
10. Run `pnpm typecheck` and `pnpm build`.

## Important next steps before making the visitor form public

- Replace the shared 5/minute local test quota with a public-grade rate
  limiter using trusted client identity plus bot defenses and monitoring.
- Choose user-visible submission confirmation and review language.
- Harden admin authentication/session storage and production access.
- Decide what to display publicly: submitted suggestions are NEVER
  automatically approved or added to the dictionary.
- Prepare a privacy notice and data retention policy before collecting
  genuine visitor information.
- Verify behavior on an isolated staging deployment before release.
- Do not turn on Production `SPELLING_SUBMISSIONS_ENABLED` based on the
  local demo. The API currently rejects Production and Preview requests.

This branch remains a draft and has not been merged into the live site.
