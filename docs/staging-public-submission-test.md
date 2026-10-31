# Lazy Dictionary — Isolated Preview staging checklist

**Status:** Infrastructure and code prepared; NOT launched. This is an
experiment to verify the visitor spelling form on a real HTTPS domain without
writing to the live dictionary's Supabase database.

The feature branch is:
`feature/spelling-experiment-phase1`

The proposed dedicated test address is:
`staging.lazydictionary.com`

It is only an example until you actually configure the DNS and Vercel
branch domain. Creating the GitHub code does not create this subdomain.

## Safety rules

1. Do not edit Production environment variables.
2. Do not merge the draft PR or push this branch into `main`.
3. Use a NEW Supabase project for staging: **never point Preview writes at
   your original Lazy Dictionary database**.
4. Use a separate Turnstile widget and secret key for staging.
5. Keep `PUBLIC_SPELLING_SUBMISSIONS_ENABLED=false` in Production.
6. All secrets go into Vercel environment settings, NEVER GitHub or chat.

## Step 1 — Create a separate Supabase staging database

- In Supabase, create a **different project**, e.g. `lazy-dictionary-staging`.
- Open its SQL Editor and run, in order:
  - `supabase/staging_submissions.sql`: minimal private `spelling_submissions`
    table with `pending` as default.
  - `supabase/public_submission_quota.sql`: persistent per-IP-derived quotas.
- Check the staging table exists:

```sql
SELECT COUNT(*) AS test_submissions
FROM public.spelling_submissions;
```

Expect zero before tests. Note the new project's Project URL and
server-only `sb_secret_...` key. Do not share them in chat.

The existing live Supabase project and its test submissions are untouched.

## Step 2 — Give the Preview branch a permanent HTTPS hostname

This is done **in Vercel**, where your project already lives:

1. Open the Lazy Dictionary project → Settings → Domains.
2. Add `staging.lazydictionary.com` and follow Vercel's DNS instructions.
3. Connect this domain to the **Preview** environment and assign it to
   the Git branch `feature/spelling-experiment-phase1`.
4. Confirm opening `https://staging.lazydictionary.com` loads the
   feature-branch application and NOT the production branch.

Official Vercel instructions:
https://vercel.com/docs/domains/working-with-domains/assign-domain-to-a-git-branch

Do not switch the actual `lazydictionary.com` production domain to Preview.
Only the new staging subdomain should point to Preview.

## Step 3 — Create the staging Cloudflare Turnstile widget

1. Go to Cloudflare dashboard → Turnstile → Add widget.
2. Name it `Lazy Dictionary Staging`.
3. Add exactly `staging.lazydictionary.com` to allowed hostnames.
4. Choose Managed (or your preferred compatible mode).
5. Retrieve the public **site key** and private **secret key**.

Never put the secret key in the site HTML or a `VITE_` environment
variable. It belongs ONLY on the server as `TURNSTILE_SECRET_KEY`.

Official docs:
https://developers.cloudflare.com/turnstile/get-started/
https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

Cloudflare test keys are useful for unit tests, but they use dummy
hostname/action responses; our secure server validates both fields.
For the real staging end-to-end test, use your own staging widget.

## Step 4 — Set Preview branch-scoped Vercel environment variables

Vercel Project → Settings → Environment Variables → select **Preview** →
select **ONLY** `feature/spelling-experiment-phase1` as Git branch.

Values for this staging branch:

```dotenv
STAGING_SPELLING_SUBMISSIONS_ENABLED=false
PUBLIC_SPELLING_HOSTNAME=staging.lazydictionary.com
SUPABASE_URL=https://STAGING_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=STAGING_SUPABASE_SERVER_ONLY_SECRET
TURNSTILE_SITE_KEY=STAGING_PUBLIC_SITE_KEY
TURNSTILE_SECRET_KEY=STAGING_PRIVATE_TURNSTILE_SECRET
PUBLIC_RATE_LIMIT_PEPPER=AT_LEAST_32_RANDOM_SECRET_CHARACTERS
```

Use your actual credentials privately; the strings above are placeholders.

**Do not set** `PUBLIC_SPELLING_SUBMISSIONS_ENABLED=true` in Preview.
That flag is reserved for Production, which remains disabled. The only
Preview enable flag is `STAGING_SPELLING_SUBMISSIONS_ENABLED`.

Ensure Vercel has **Automatically expose System Environment Variables**
enabled if required to provide `VERCEL_ENV` and
`VERCEL_GIT_COMMIT_REF`. The staging server checks both. If the branch
name cannot be verified, submissions fail closed.

Changes to environment variables need a **new Preview deployment** before
they affect code; simply changing a setting does not update an old deploy.

## Step 5 — Confirm the default fails closed

Before switching staging on, open:

```
https://staging.lazydictionary.com/api/spellings
```

Expected: JSON showing `"enabled": false` and `"mode":"preview"`.
The form should say **Preview spelling** and should not store anything.

Also make sure the live site stays untouched:
`https://lazydictionary.com` should still have no active public
submission API.

## Step 6 — Turn on staging only

When Steps 1–5 are complete, change ONLY the Preview branch variable:

```dotenv
STAGING_SPELLING_SUBMISSIONS_ENABLED=true
```

Redeploy the feature branch Preview. Refresh the staging page.

Expected: `GET /api/spellings` returns `enabled=true`,
`mode="public"`, `environment="staging"`, and the public Turnstile
site key. The form displays a **Staging environment** notice.

Do not enable Production. This staging flag does NOT grant production
write access, and it checks the exact staging hostname and feature branch.

## Step 7 — End-to-end manual checks

Perform these on `https://staging.lazydictionary.com` ONLY:

1. Submit `Psychology → Sykoloji` after completing Turnstile.
2. In DevTools → Network, verify `POST /api/spellings` returns HTTP 201.
3. In STAGING Supabase SQL Editor, verify the saved row has
   `moderation_status = 'pending'`.
4. Verify the original Supabase project's rows did NOT change.
5. Submit with an invalid or expired challenge: expect HTTP 403.
6. Submit five valid attempts within the same minute. The limit is four
   per IP-derived scope, so the excess attempt should return HTTP 429
   with `Retry-After`. Window boundaries may reset allowances.
7. Submit from a different Origin or without the required Origin header:
   expect HTTP 403.
8. Verify no admin data is exposed: `/api/admin-submissions`,
   `/api/admin-audit`, `/api/spelling-records`, and
   `/api/spelling-analytics` must refuse requests on staging.
9. Check mobile screen width, keyboard navigation and widget loading.

Do not post screenshots of authorization headers, Turnstile response
tokens, private keys, or Vercel secret values.

## Step 8 — Roll back after testing

In Vercel Preview for that exact branch, set:

```dotenv
STAGING_SPELLING_SUBMISSIONS_ENABLED=false
```

Redeploy to apply the change and verify
`GET /api/spellings` returns `enabled:false`.

The separate staging database may retain dummy test submissions for
inspection; remove them later according to your own test data policy.
Never delete your live database records during staging cleanup.

## Not yet production-ready

- User acceptance checks and proper integration/negative-path tests remain.
- Admin moderation on a deployed site is intentionally disabled. For
  staging you can inspect rows using the Supabase SQL Editor.
- Add backups, quota-counter cleanup, privacy notice, monitoring,
  production-grade admin authorization, and incident recovery procedures.
- Verify Turnstile functionality using your own staging credentials.
- The public launch requires a separate explicit production decision.

Current code changes are on a **draft PR** only, not deployed to the
production `main` branch.
