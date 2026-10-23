# Phase 2–3 — Save spelling submissions in Supabase

This step connects the Spelling Experiment to a real PostgreSQL table.

## Architecture

```
React form (src/components/SpellingExperiment.tsx)
  → POST /api/spellings
  → Vercel Function (api/spellings.ts)
  → Supabase REST API using a SERVER-ONLY secret key
  → public.spelling_submissions table
```

`GET /api/spellings` returns `{ "enabled": true | false }`.
If the API is unavailable or not enabled, the form remains a preview-only demo.
If enabled, the form displays **Save spelling**, submits JSON, and shows the
saved database row ID only after the server confirms the insert.

## 1. Confirm your existing table

You already created the table in Supabase during the SQL lesson. Run:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'spelling_submissions'
ORDER BY ordinal_position;
```

Expected columns: `id`, `original_word`, `suggested_spelling`, `created_at`.

If you have not yet created it, use:

```sql
CREATE TABLE IF NOT EXISTS public.spelling_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  original_word VARCHAR(60) NOT NULL,
  suggested_spelling VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.spelling_submissions ENABLE ROW LEVEL SECURITY;
```

Do **not** create a public insert policy for the anon role for this test.
The server uses a secret API key, which has elevated access.

## 2. Configure local environment (do not publish secrets)

On Windows PowerShell in the project directory:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` and set:

```dotenv
SUPABASE_URL=https://YOUR_REAL_PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=YOUR_REAL_SB_SECRET_KEY
SPELLING_SUBMISSIONS_ENABLED=true
```

In the Supabase Dashboard, find your Project URL and the
`sb_secret_...` **Secret Key** in Project Settings / API Keys (or the project's
Connect dialog). Create a dedicated secret key for this local experiment if
available.

**Never** paste the secret into chat, commit it to GitHub, put it in a
`VITE_*` variable, or use it in frontend code. The repository's `.gitignore`
excludes `.env.local`.

Use new-style `sb_secret_...` keys. They belong in the `apikey` header,
not `Authorization: Bearer`. The server API handles this correctly.

## 3. Run with the API (not just Vite)

Normal `pnpm dev` runs Vite only, so the form falls back to **Preview mode**.

To run **both** Vite and the Vercel API locally:

```powershell
pnpm install
npx vercel dev
```

The Vercel CLI may ask you to sign in and link this folder to your existing
Vercel project. Choose your Lazy Dictionary project; do not deploy to
production. The configured Vite dev command is `pnpm dev`.

Open the URL printed by `vercel dev` (usually `http://localhost:3000`).

Visit `http://localhost:3000/api/spellings`. If everything is configured,
you should see:

```json
{"enabled": true}
```

If it returns `false`, check `.env.local` and restart the dev process.
If you are still running only Vite, you will not have the server API.

## 4. Make your first real insert

In the Spelling Experiment form, enter:

- Original English word: `Enough`
- Suggested spelling: `Enuf`

Click **Save spelling**. It should show a success message and a database ID.

In Supabase's SQL Editor, run:

```sql
SELECT id, original_word, suggested_spelling, created_at
FROM public.spelling_submissions
ORDER BY id DESC
LIMIT 5;
```

You should find a NEW row for `enough → enuf` at the top.
Refresh the website. The recent activity list clears, but the row remains
in PostgreSQL. This is the difference between in-memory React state and
persistent storage.

## 5. Test a failed submission

Try these invalid values:

- `Hello` → `hello` (same spelling)
- `abc123` → `abk` (numbers are not accepted)
- An empty original word

The browser and server validate them using the same
`src/lib/spellingSubmission.ts` function. No invalid record should be inserted.

If the database is unreachable, the form displays an error and keeps both
input values for another attempt.

## Safety for this educational phase

- Database writes require `SPELLING_SUBMISSIONS_ENABLED=true`.
- Writes are **always disabled** on Vercel Preview and Production deployments,
  regardless of the toggle. Only local development can enable them.
- The server-only secret key is never included in browser JavaScript.
- The API accepts only small JSON submissions and checks spelling length
  and allowed characters on the server.
- This is **not yet a public-ready submission feature**. Before enabling
  public writes, add reliable rate limits, anti-bot measures, moderation,
  and monitoring. A user-supplied spelling does not prove a unique visitor.
- Supabase secret API keys bypass Row Level Security; treat them as highly
  privileged and revoke/rotate any accidentally exposed key.

## Follow-up exercises

1. Save `phone → fon` through the website and verify it with SQL.
2. Save a second suggestion for `phone`; confirm that it has a different ID.
3. Refresh your browser and retrieve both rows via SQL.
4. Run `pnpm typecheck` and `pnpm build`.
5. Keep the GitHub pull request as a draft until local tests pass.

This keeps Phase 2 practical: you write in the **frontend**, follow the HTTP
request in browser DevTools, inspect the **server API** result, and confirm the
actual row with a **SQL query**.
