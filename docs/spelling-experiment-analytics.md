# Phase 5 — PostgreSQL analytics dashboard

Your Phase 3 and Phase 4 exercises established the data flow:
React → Vercel API → Supabase PostgreSQL and back.

The dashboard now asks PostgreSQL to perform the counting with `COUNT`,
`COUNT(DISTINCT ...)` and `GROUP BY`. This is preferable to estimating
totals from the 20 rows displayed in the existing database viewer.

## Step 1 — Install the database function

In your SAME Supabase project (`lazy-dictionary-db`), open **SQL Editor**.
Copy and execute the entire contents of:

```
supabase/phase5_spelling_analytics.sql
```

You must run this SQL once in Supabase before the dashboard can load real data.
The SQL creates `public.spelling_analytics()`, limits execution to
`service_role`, and requests a PostgREST schema cache refresh.

Check the returned JSON directly with:

```sql
SELECT public.spelling_analytics();
```

The response should have:
- `total_submissions`: total rows in the database, including duplicates.
- `unique_words`: number of different original English words.
- `unique_alternatives`: count of distinct original/suggested spelling PAIRS.
- `top_words`: up to 10 words by submission count.
- `top_spellings`: up to 10 original/suggested pairs by submission count.
- `daily_submissions`: days with submissions in the past 14 days, by UTC date.

SQL returns accurate totals for the whole table, regardless of the viewer's
20-row pagination limit.

## Step 2 — Update your local app

In the VS Code terminal:

```powershell
git switch feature/spelling-experiment-phase1
git pull origin feature/spelling-experiment-phase1
npx vercel dev
```

Keep your existing `.env.local` and Development environment configuration.
Use the localhost URL shown by `vercel dev` (the port may not be 3000).

Under **Spelling Experiment**, the new **Spelling analytics** dashboard appears
when database mode is enabled, above the saved-record viewer.

You can inspect the JSON response at:

```
http://localhost:YOUR_PORT/api/spelling-analytics
```

If you see “Analytics SQL function not found,” confirm you ran the SQL in
the same Supabase project your app is connected to, and retry. Do not
recreate the Supabase project or change secret keys to fix a missing function.

## Step 3 — Practice reading the data

With the first two real records from your screenshots (enough → enuf,
philosophy → filosofy), the expected statistics BEFORE additional
submissions are:
- Total submissions: 2
- Unique original words: 2
- Distinct spelling pairs: 2

These are an illustration of the earlier observed test data, not a live
query executed by ChatGPT.

Save `enough → enof` in the form and watch the dashboard refresh.
Expected after these THREE test submissions:
- Total submissions: 3
- Unique words: 2
- Distinct spelling pairs: 3
- `enough` has 2 submissions and 2 distinct alternatives

Save `enough → enuf` a SECOND time:
- Total submissions: 4
- Unique words: 2
- Distinct spelling pairs: 3

This demonstrates the difference between a repeated submission and a
new distinct spelling.

## Step 4 — Write equivalent SQL queries

```sql
-- Entire database row count
SELECT COUNT(*) FROM public.spelling_submissions;

-- Unique original words
SELECT COUNT(DISTINCT original_word)
FROM public.spelling_submissions;

-- Number of distinct spelling pairs
SELECT COUNT(DISTINCT (original_word, suggested_spelling))
FROM public.spelling_submissions;

-- How many submissions and unique alternatives for each word?
SELECT original_word,
       COUNT(*) AS submissions,
       COUNT(DISTINCT suggested_spelling) AS unique_spellings
FROM public.spelling_submissions
GROUP BY original_word
ORDER BY submissions DESC, original_word;

-- Which original/suggested pairs get repeated?
SELECT original_word, suggested_spelling,
       COUNT(*) AS submissions
FROM public.spelling_submissions
GROUP BY original_word, suggested_spelling
ORDER BY submissions DESC, original_word, suggested_spelling;
```

## Security and deployment status

The function uses `SECURITY INVOKER`, and `EXECUTE` is revoked from
`PUBLIC`, `anon`, and `authenticated`, then granted to `service_role`.
Supabase new-style secret keys are server-only and execute as service_role.

`GET /api/spelling-analytics` also only runs on localhost in development
with the existing environment flags. Do not make it publicly reachable as
an admin dashboard without authentication and permission design.

User-contributed spelling counts are counts of **submissions**, NOT unique
visitors or evidence of independent human agreement. Spam protection,
moderation, and privacy safeguards are required before a public rollout.
