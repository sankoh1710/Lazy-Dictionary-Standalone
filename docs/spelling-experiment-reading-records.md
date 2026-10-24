# Phase 4 — Read and manage your PostgreSQL submissions

Phase 3 confirmed a real insert from the React form to Supabase.
This phase lets you **read** saved rows through the app and compare the API
request against actual SQL. There is deliberately **no browser edit/delete** yet.

## 1. Pull the project changes

```powershell
git switch feature/spelling-experiment-phase1
git pull origin feature/spelling-experiment-phase1
npx vercel dev
```

Keep your existing secret key in your ignored local `.env.local`
and Vercel Development configuration. Do not commit, paste, or publish it.

Open the local URL printed by Vercel, for example
`http://localhost:3002/` (your port may differ).

When GET `/api/spellings` replies `{"enabled":true}`, the page now renders
**Saved spellings — database viewer** underneath the submission form.

## 2. Inspect the API response

Open the local URL with the **actual port** from your terminal:

```
http://localhost:3002/api/spelling-records?word=enough&sort=recent&limit=20
```

Expected structure (values come from your real data):

```json
{
  "records": [
    {
      "id": 1,
      "original_word": "enough",
      "suggested_spelling": "enuf",
      "created_at": "2026-10-23T..."
    }
  ],
  "total": 1,
  "filter": "enough",
  "sort": "recent"
}
```

Do not assume your ID or record count will be 1; they depend on your table.

Supported query options:
- `word`: optional original-word equality filter, case-insensitive through
  lowercasing (submitted words are stored lowercase).
- `sort`: `recent` or `oldest`, by id.
- `limit`: number from 1–30; UI requests 20.

The API requests a count with Supabase PostgREST `Prefer: count=exact`,
and parses the returned `Content-Range` header. Missing counts are shown
as unknown instead of being fabricated.

## 3. Write the equivalent SQL yourself

Start with:

```sql
SELECT id, original_word, suggested_spelling, created_at
FROM public.spelling_submissions
ORDER BY id DESC
LIMIT 20;
```

Now filter just `enough`:

```sql
SELECT id, original_word, suggested_spelling, created_at
FROM public.spelling_submissions
WHERE original_word = 'enough'
ORDER BY id DESC
LIMIT 20;
```

Count the matching rows:

```sql
SELECT COUNT(*) AS total
FROM public.spelling_submissions
WHERE original_word = 'enough';
```

The viewer's “Matching submissions” count should match this count, while
“Rows returned” is capped at 20. These are not the same number when you
have more than 20 matches.

## 4. Practice UPDATE and DELETE inside a transaction

**Use only disposable test data**, not real visitor submissions.
First find an ID you want to test:

```sql
SELECT id, original_word, suggested_spelling
FROM public.spelling_submissions
ORDER BY id DESC LIMIT 10;
```

In the following example, replace `1` with the ID of a test row that
actually exists. **Run the transaction statements together**:

```sql
BEGIN;

UPDATE public.spelling_submissions
SET suggested_spelling = 'enuff'
WHERE id = 1
RETURNING id, original_word, suggested_spelling;

SELECT id, original_word, suggested_spelling
FROM public.spelling_submissions
WHERE id = 1;

ROLLBACK;
```

`ROLLBACK` cancels the change. In this exercise, the saved record remains
unchanged. You can similarly rehearse deletion:

```sql
BEGIN;

DELETE FROM public.spelling_submissions
WHERE id = 1
RETURNING id, original_word, suggested_spelling;

ROLLBACK;
```

Change the example ID before running. **Do not remove WHERE from DELETE.**
Only replace `ROLLBACK` with `COMMIT` when you intentionally want the
database change to persist.

## 5. Verify the dashboard

- [ ] You can see the "Saved spellings" table in local database mode.
- [ ] A new submission appears after saving without reloading the whole page.
- [ ] Filter `enough` matches the same SQL `WHERE` query.
- [ ] Changing sort order flips newest and oldest rows.
- [ ] Refresh keeps database rows, even though in-memory previews clear.
- [ ] `/api/spelling-records` is unavailable in deployed Preview/Production.
- [ ] `pnpm typecheck` and `pnpm build` pass.

## Security boundary

The read-only route `api/spelling-records.ts` accepts local-loopback GET
requests when `SPELLING_SUBMISSIONS_ENABLED=true` and
`VERCEL_ENV` is development/unset. It rejects Preview/Production access.
The secret Supabase key is used **only on the server**.

This viewer is **not** an authenticated admin dashboard. Do not make it
publicly available by removing the local-only checks. Before collecting
real user submissions, add authentication, rate limiting, abuse controls,
moderation, and a data-retention/privacy policy.

Phase 5 can add a protected admin interface and aggregate statistics.
