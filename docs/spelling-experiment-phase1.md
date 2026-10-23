# Phase 1 — Spelling Experiment (frontend)

## Goal

Let a visitor type an English word and their own alternative spelling.
This is an experiment in **React form handling**, not data collection yet.

The component is in `src/components/SpellingExperiment.tsx` and is rendered
on the homepage by `src/App.tsx`.

## Data flow today

1. A visitor types the original word and suggested spelling.
2. React holds the field contents in component state.
3. Submitting checks that both values are non-empty, use English letters
   (with optional apostrophes or hyphens inside a word), and are different.
4. React adds the pair to a temporary preview list (last five items).
5. Refreshing the page clears the previews.

There are **no** API requests, localStorage writes, cookies, or database writes.
The button says **Preview my spelling**, not **Save**, to make this clear.

## Run locally

```bash
pnpm install
pnpm dev
```

Use the development URL shown in the terminal, usually http://localhost:5173.

## Manual test checklist

- [ ] `Enough` and `Enuf` create a preview
- [ ] `Phone` and `Fon` create a second preview
- [ ] Empty fields display an error
- [ ] `Hello` and `hello` are rejected as unchanged spelling
- [ ] Numbers and symbols are rejected
- [ ] A sixth preview replaces the oldest visible preview
- [ ] Refreshing removes all previews
- [ ] Existing dictionary search, word pages, and alphabet still work
- [ ] On mobile, both inputs and the submit button remain usable

Run the TypeScript and production checks with:

```bash
pnpm typecheck
pnpm build
```

## Next phase

Create a PostgreSQL table, insert test rows manually, and practice SQL.
Only after that should the form send a POST request to a validated server endpoint.
Do not add a public database write key to client-side code.
