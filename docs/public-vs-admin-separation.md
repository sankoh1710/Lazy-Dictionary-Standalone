# Visitor form vs. local-only administration (current MVP)

**Homepage**: a simple alternative-spelling submission form. It submits
via `POST /api/spellings` when the server reports submissions enabled.
The server saves valid suggestions as `pending`; approved submissions do
not yet automatically enter the published dictionary.

**Private administration**: on localhost `/admin`, the allowlisted owner
signs in to Supabase Auth to review, reject, delete, explore statistics,
and inspect historical moderation events. Sensitive list/analytics/admin
APIs verify the admin token on the server. This page and its APIs remain
disabled on Vercel Production and Preview.

**Preview deployments**: the button is disabled because saving is not
enabled. There is no staging-domain or Turnstile prerequisite for MVP.

**Production**: the visitor form becomes available ONLY when all
Production-only server checks pass, including the exact configured HTTPS
host, private database credentials, private HMAC pepper, and explicit
`PUBLIC_SPELLING_SUBMISSIONS_ENABLED=true`. Validated submissions
receive a 4/minute and 20/hour per-client quota through the restricted
PostgreSQL function.

**Local development**: the previously tested 5/minute shared quota
remains available with `SPELLING_SUBMISSIONS_ENABLED=true` and
`npx vercel dev`.

For exact release and rollback steps:
`docs/mvp-live-release.md`.

Work is not automatically deployed by creating or editing this
development-branch file. The GitHub PR stays draft until approved.
