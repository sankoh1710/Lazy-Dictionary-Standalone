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
