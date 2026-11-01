# Lazy Dictionary: minimal visitor-submission launch

This branch is **ready for release preparation**, NOT live or enabled.
The public form has only two text fields. Visitors do not sign in.
Every saved suggestion has status **pending** until the owner reviews it.

We intentionally postponed Cloudflare Turnstile, a staging subdomain,
and a second Supabase project. We retain simple baseline protections:
- Server-side spelling validation and strict maximum request size
- Exact production-hostname and HTTPS checks
- Same-site request Origin check
- 4 validated submissions/minute and 20/hour per Vercel-reported IP,
  implemented atomically in PostgreSQL
- HMAC-SHA256 with a private pepper (database stores no raw IP address)
- Protected Supabase secret stored only on Vercel server functions
- Private admin/moderation/data/audit endpoints remain localhost-only

## 1. Prepare the existing Supabase database

Use the SAME Supabase project you already used for local admin moderation
and audit testing. Do **not** create a new Supabase project.

The earlier migrations for `spelling_submissions`, moderation,
and audit logging have already been installed during local learning.
Now run ONE additional migration in that same project's SQL Editor:

```
supabase/public_submission_quota.sql
```

It creates the private quota table and a restricted RPC:
`public.consume_public_spelling_quota(p_scope_hash text)`.

Check migration with this read-only SQL:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'consume_public_spelling_quota';
```

And verify `spelling_submissions` still has `moderation_status`.
Don't run the quota RPC manually; calls consume allowance.

## 2. Configure Vercel Production environment only

Open Vercel Dashboard → your Lazy Dictionary project →
Settings → Environment Variables. Select **Production**.

Set these, using actual values from the EXISTING Supabase project:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_YOUR_PRIVATE_KEY
PUBLIC_SPELLING_HOSTNAME=lazydictionary.com
PUBLIC_RATE_LIMIT_PEPPER=YOUR_OWN_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
PUBLIC_SPELLING_SUBMISSIONS_ENABLED=false
```

Generate a private pepper on your computer using Node:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Save the generated value privately in Vercel Production and do NOT
commit it or paste it into chat, GitHub, issue comments or screenshots.
Set Vercel's sensitive/secret option for the Supabase secret and pepper.

Do **not** configure Turnstile keys, an alternative database, or a
staging subdomain for this MVP.

The enabling flag intentionally stays **false** until after deploying
and checking the site. All Preview deployments remain read-only.

Vercel environment changes take effect on a NEW deployment, not an old one.
If the Vercel system variable `VERCEL_ENV` is not made available,
the public API fails closed. It must equal `production` when live.

## 3. Check, then publish the code

- The GitHub branch is `feature/spelling-experiment-phase1`.
- Review the draft PR #1, which contains the whole learning project.
- Wait for GitHub `pnpm typecheck`, `pnpm build` and Vercel preview
  build statuses to be green.
- Check homepage still shows the dictionary, Lazy Alphabet, and only the
  simple visitor spelling form (NOT the private records/admin controls).
- The site must remain usable without working Supabase credentials.

Only after the owner approves the release: merge the PR into `main`.
Vercel ordinarily deploys the new `main` revision to Production.
**Do not do this as part of automatically preparing the branch.**

With the flag still false, verify the newly deployed Production API:
```http
GET https://lazydictionary.com/api/spellings
```
Response should contain `"enabled": false`. The public button is
disabled and clearly says submissions are not open yet.

## 4. Enable public submissions deliberately

Only when the SQL migration and Production secrets are configured:

Change `PUBLIC_SPELLING_SUBMISSIONS_ENABLED` to `true` in Vercel
**Production**, then redeploy from the new `main`.

Check:

```http
GET https://lazydictionary.com/api/spellings
```

Response should contain `"enabled": true, "mode": "public"`.
The normal visitor form should now allow submission.

Submit ONE disposable spelling through the WEBSITE (e.g.
`example → egzampul`).

Expect the browser Network tab's `POST /api/spellings` to return
HTTP **201 Created**. In the same Supabase database, run:

```sql
SELECT id, original_word, suggested_spelling,
       moderation_status, created_at
FROM public.spelling_submissions
ORDER BY id DESC LIMIT 10;
```

Expect your test record to have `moderation_status = 'pending'`.
If something fails, turn the enable flag back to `false` and redeploy.
The existing dictionary remains accessible.

The `/admin` UI and all private read/admin APIs are intentionally
disabled on Production. You can continue reviewing live suggestions using
your already configured local `npx vercel dev` administration, provided
its Supabase URL points at that SAME database.

## 5. What happens with abuse and what we are NOT promising

- HTTP **429** with a `Retry-After` header after quota is exceeded.
- The per-IP restriction can inconvenience people sharing a network,
  while an attacker using many IPs may still evade it.
- Origin is a useful browser-side gate, not proof of human identity.
- The server's secret key bypasses RLS, so it stays strictly server-side.
- Rate-limit identifiers are pseudonymous HMAC digests, not anonymous
  against all possible correlation. Stored quota rows older than 48 hours
  are removed opportunistically on a subsequent quota check (not by a
  dedicated background service).
- An approval is a moderation decision only; it does NOT automatically
  publish the suggested spelling into the dictionary.
- Production admin access remains off; no public admin route is available.
- A future rise in traffic or spam may justify Turnstile, more robust
  monitoring, backup/retention management, and production admin workflows.
- Review your site's privacy disclosures before collecting real user
  submissions.

## Rollback

To immediately stop **new submissions**, set
`PUBLIC_SPELLING_SUBMISSIONS_ENABLED=false` under Vercel Production
and redeploy. The dictionary continues functioning normally.

To remove the feature visually, revert the release commit in GitHub
and redeploy. Do NOT delete the database tables merely to disable writes.

Do not merge this PR or change the Production enable flag without the
owner's explicit approval.
