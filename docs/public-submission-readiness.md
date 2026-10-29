# Preparing public spelling submissions — NOT LAUNCHED

The homepage has already been separated from the private admin tools.
This change prepares an **explicitly disabled-by-default** production
submission path. It must be tested before merging/enabling it.

## What remains unchanged

- Local `npx vercel dev` still accepts valid spelling submissions, using
  the previously installed five-submissions/minute local quota.
- Admin moderation, analytics, audit history and record viewer stay in
  the development-only, authenticated `/admin` area.
- Preview/Production sites without the full opt-in configuration show
  **Preview spelling** and state that nothing is being saved.
- No user sign-in is required for the eventual public spelling form.
- Incoming suggestions are inserted with `moderation_status = 'pending'`;
  approving them does not yet publish them as dictionary entries.

## Public flow (only after explicitly enabled)

React form → Cloudflare Turnstile widget → POST /api/spellings →
server validates word fields, origin and trusted Vercel IP →
private PostgreSQL per-IP-derived limit → Cloudflare Siteverify →
PostgreSQL INSERT as pending → success response.

Do **not** trust the challenge widget alone: the server validates every
token with Cloudflare Siteverify. Tokens expire in five minutes and may only
be validated once. The frontend resets its challenge after every attempt.

## Step 1: Supabase migration (when preparing staging)

Run the entire file in the same Supabase project:

```
supabase/public_submission_quota.sql
```

It creates `private.spelling_public_limits` and a restricted
`public.consume_public_spelling_quota(p_scope_hash text)` RPC.
The server computes a SHA-256 HMAC of the client IP with a secret pepper;
PostgreSQL stores only the pseudonymous hex digest, never the raw IP.

Current public quotas are **4 attempts/minute** and **20 attempts/hour**
per IP-derived scope. Attempts include valid-shape requests that fail the
Turnstile challenge. This is a practical early protection, NOT a guarantee
of unique users (shared networks can share the same limit).
The limiter uses atomic database upserts to handle concurrent requests.

The source IP is taken ONLY from Vercel's trusted `x-vercel-forwarded-for`
header, never from request JSON or an untrusted application header.
If the header is unavailable, submissions fail closed. This is designed
specifically for deployment behind Vercel's managed proxy.

The private counter table needs cleanup of rows older than two days.
See the SQL file for the retention statement; arrange automated cleanup
and monitoring before launch.

## Step 2: Cloudflare Turnstile (when ready to test staging)

In Cloudflare Turnstile, create a widget:
- Choose a managed/non-intrusive widget.
- Restrict allowed hostnames to **only domains you control**.
- Use separate test/staging and production widget configurations.
- Copy the site key (public) and secret key (private) separately.

Documentation:
- https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

The frontend uses explicit SPA rendering and sets action
`spelling_submit`; the backend verifies BOTH that action and the
Turnstile response hostname match the configured production hostname.

## Step 3: Production environment configuration

**DO NOT SET THE ENABLE FLAG TRUE YET.** First prepare and test an
isolated staging environment with an explicitly assigned test hostname
and its own Turnstile widget (preview requests are currently disabled
by design, so staging support still needs deliberate work).

Required server-side environment variables for the eventual launch:

```dotenv
# Existing, private, server-only:
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY

# New opt-in fields:
PUBLIC_SPELLING_SUBMISSIONS_ENABLED=false
PUBLIC_SPELLING_HOSTNAME=lazydictionary.com
TURNSTILE_SITE_KEY=YOUR_PUBLIC_SITE_KEY
TURNSTILE_SECRET_KEY=YOUR_PRIVATE_TURNSTILE_SECRET
PUBLIC_RATE_LIMIT_PEPPER=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
```

Store private values as Vercel Secret environment variables and keep
them OUT of GitHub, browser code, issue comments, and chat screenshots.
Only a deliberate change of `PUBLIC_SPELLING_SUBMISSIONS_ENABLED` to
`true` on the production environment permits production writes, and
only if all other required fields and hostname match.

Important: the `TURNSTILE_SITE_KEY` may be sent to the browser when
enabled; the `TURNSTILE_SECRET_KEY`, `SUPABASE_SECRET_KEY` and rate-limit
pepper must never be exposed.

## Step 4: Safeguards to verify before launch

- [ ] Local submit still works and local quota returns 429.
- [ ] Without opt-in, deployed `GET /api/spellings` says enabled=false.
- [ ] Without opt-in, deployed POST is rejected and writes **no record**.
- [ ] With test configuration, Turnstile passes only with a valid,
      fresh, single-use token from an allowed hostname.
- [ ] Missing, expired or replayed token is rejected.
- [ ] Same-host origin and trusted Vercel proxy source are required.
- [ ] Submissions are always pending; moderation remains private.
- [ ] Requests exceeding the per-client quota return HTTP 429.
- [ ] Database errors fail closed, no hidden bypass path.
- [ ] Test through an isolated staging domain BEFORE enabling production.
- [ ] Monitoring, retention cleanup, spam reports, backup/restore
      procedures, and a privacy notice are in place.
- [ ] A production admin workflow exists for moderation. The current
      admin API is intentionally localhost-only.
- [ ] Test accessibility and mobile behavior of the Turnstile challenge.
- [ ] TypeScript, production build, and API integration tests pass.

## Why the launch is NOT finished

The protected production POST path is implemented but has not been
exercised with real Cloudflare credentials, a deployed staging host,
or a production-like rate-limit test. Current `/admin` is local-only,
so reviewing live submissions remotely would also need a separately
hardened admin deployment.

For now, keep the draft PR unmerged and the enable flag false.
