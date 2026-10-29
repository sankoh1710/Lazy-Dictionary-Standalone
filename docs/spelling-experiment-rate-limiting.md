# Phase 6B, Part 1 — Practical rate limiting

You have already tested React → Vercel → PostgreSQL inserts, SQL analytics,
and protected admin moderation. The next backend lesson is **rate limiting**:
what should happen if someone submits many requests in a short time?

This exercise sets **5 VALID spelling submissions per fixed 60-second
calendar window** for the whole local-development experiment.

It is a **shared demonstration quota**, NOT a per-user limit. All
development sessions connected to the same Supabase project share it.
It does not collect IP addresses, emails, or any personal identifier.

## 1. Install the database migration

In your existing Supabase project, open SQL Editor and run ALL contents of:

```
supabase/phase6b_local_rate_limit.sql
```

It creates:
- `private.spelling_rate_limits`: persisted request counters.
- `public.consume_local_spelling_quota()`: one atomic counter operation.
- Permission restrictions: `service_role` may execute the function, but
  `anon` and `authenticated` cannot.

It leaves all your spelling submissions and moderation decisions unchanged.

The `private` schema is not intended for public Supabase Data API exposure.
Do not add `private` to Supabase's exposed API schemas.

The function counts using an atomic PostgreSQL upsert:
`INSERT ... ON CONFLICT DO UPDATE`. That handles simultaneous requests
across multiple serverless invocations more reliably than an in-memory
JavaScript counter.

**Do not call the quota function just to inspect it**: every call CONSUMES
a request allowance.

## 2. Pull code and run locally

Stop your existing server with Ctrl+C, then:

```powershell
git switch feature/spelling-experiment-phase1
git pull origin feature/spelling-experiment-phase1
npx vercel dev
```

Use the localhost address that Vercel prints (port varies).

Your original `.env.local` and Vercel Development variables remain the
same. No new environment variables or service accounts are required.

## 3. Test the limit using the application

Within one UTC clock minute, submit 6 valid spellings through the form.
Use your own disposable examples. For example, submit the same test pair
`example → egzampul` six times; the form deliberately allows repeated
pairs for this learning experiment.

Expected:
1. Submissions 1–5: **201 Created**, a new PostgreSQL record each time.
2. Submission 6: **429 Too Many Requests**, with a retry message.
3. The sixth submission **does not** add another row to PostgreSQL.
4. The form keeps the input values after a 429 response.
5. After the minute boundary, another valid submission is accepted.

The 60-second buckets align to minute boundaries, not to the timestamp of
your first request. If your test crosses a minute boundary, the count
resets during the exercise. You can check the bucket via SQL below.

## 4. Inspect real network behavior

In Chrome DevTools → Network → Fetch/XHR, click the `spellings` request.

For a successful save:
- Request: `POST /api/spellings`
- Response status: **201 Created**
- Payload: original word + suggested spelling
- Response: `saved: true` plus generated record ID

For the blocked submission:
- Request: the **same POST endpoint** with valid JSON
- Response status: **429 Too Many Requests**
- Response JSON contains `retry_after_seconds`
- Response Headers contain `Retry-After`

Inspect these headers and the Response tab; do not share secret key,
Authorization header, or authentication payload screenshots.

## 5. Inspect PostgreSQL

To inspect current counts without consuming an allowance:

```sql
SELECT scope, window_start, attempts
FROM private.spelling_rate_limits
ORDER BY window_start DESC
LIMIT 5;
```

The newest counter tops out at 6, because further excessive requests
do not need to increment it. The quota is used up for that minute after
5 accepted *requests*, even if a later database insertion fails.

To inspect actual records created during the experiment:

```sql
SELECT id, original_word, suggested_spelling, created_at
FROM public.spelling_submissions
ORDER BY id DESC
LIMIT 10;
```

To compare totals for a specific disposable test pair:

```sql
SELECT COUNT(*) AS saved_test_submissions
FROM public.spelling_submissions
WHERE original_word = 'example'
  AND suggested_spelling = 'egzampul';
```

The total may include earlier test records. Compare the count before and
after the test, rather than assuming that the database starts empty.

## 6. What the limit does NOT do

- It is not per-user or per-IP; it is **one global local-testing limit**.
- Fixed-minute windows have a boundary effect: a user could make 5
  requests at the end of one minute and 5 at the start of the next.
- It only counts requests that have passed input validation; rejected
  payloads are not counted. A production API also needs earlier abuse
  controls and upstream request protection.
- An allowed request consumes its allowance before the INSERT attempt;
  a transient database failure can therefore still consume a slot.
- This does not stop a malicious automated client sending unwanted
  requests to your localhost development server.
- **Never enable public writes based on this demo alone.** Production
  needs trusted identity/IP handling, distributed rate limits, bot
  protections, monitoring, and moderation/audit policies.
- Preview and Production writes stay disabled by the pre-existing gate.

## Optional cleanup of old rate-limit counters

These are not spelling submissions. You can remove counters older than a
day with:

```sql
DELETE FROM private.spelling_rate_limits
WHERE window_start < now() - INTERVAL '1 day';
```

Only run that cleanup if you intentionally wish to discard old counter history.

## Files changed

- `supabase/phase6b_local_rate_limit.sql` — rate limit schema + atomic RPC.
- `api/spellings.ts` — check quota before saving, return HTTP 429 and
  `Retry-After` when blocked.
- `src/components/SpellingExperiment.tsx` — show local quota information.

This is the first task in Phase 6B. Later tasks: production-grade abuse
protection, audit logging for admin changes, and an approved-only public feed.
