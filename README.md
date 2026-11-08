# Lazy Dictionary

Lazy Dictionary rewrites English words using simplified phonetic spelling—the way they sound.

## Run locally

Requirements: Node.js 20.19 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open the local URL shown by Vite.

## Verify and build

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

The production site is written to `dist/public`. The build also pre-renders the homepage and dictionary word pages for search engines.

## Project structure

- `src/App.tsx` — main dictionary interface
- `src/data/dictionary.ts` — verified dictionary entries
- `src/lib/lazySpell.ts` — fallback spelling rules
- `src/pages/WordPage.tsx` — individual word pages
- `scripts/prerender.mjs` — static page generation

This repository is a standalone React, TypeScript, Vite, and Tailwind CSS project with no platform-specific runtime or deployment dependency.

## Spelling game

Visit `/play` for a five-word practice round in the dictionary's existing theme.
Players have three guesses per word, optional meaning hints, and a skip button.
Results show which words were solved with a hint. Blank or repeated guesses do
not consume attempts; matching ignores case and surrounding spaces. Accepted
variants are explicit (for example, `center` and `centre`).

The first round is fixed; replay samples five distinct words from 25 curated
entries in `src/data/gameWords.ts`. Spellings and hints come from the verified
dictionary. Game rules live in `src/lib/game.ts` and are covered by `pnpm test`.
The game runs in the browser without accounts or API calls. Refreshing resets
practice progress. Daily scheduling, saved progress, and sharing are later work.
The build pre-renders `/play` with its own metadata for direct visits.

