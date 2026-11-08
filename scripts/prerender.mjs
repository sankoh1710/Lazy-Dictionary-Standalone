/**
 * Post-build static pre-render script.
 *
 * 1. Renders the homepage into dist/public/index.html (existing behaviour).
 * 2. Generates one static HTML page per dictionary word at
 *    dist/public/word/<slug>/index.html, each with word-specific <title>,
 *    <meta description>, canonical, og:*, and DefinedTerm JSON-LD.
 * 3. Writes an updated dist/public/sitemap.xml that includes all word URLs.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const ssrBundlePath = resolve(root, 'dist/server/entry-server.js');
const indexHtmlPath  = resolve(root, 'dist/public/index.html');

// ---------------------------------------------------------------------------
// 1. Load the SSR bundle (compiled by `vite build --ssr`)
// ---------------------------------------------------------------------------
const { render, renderWord, renderGame, dictionary } = await import(ssrBundlePath);

// ---------------------------------------------------------------------------
// 2. Pre-render the homepage
// ---------------------------------------------------------------------------
const homepageHtml = render();
const template     = readFileSync(indexHtmlPath, 'utf-8');

const homepageOutput = template.replace(
  '<div id="root"></div>',
  `<div id="root">${homepageHtml}</div>`,
);
writeFileSync(indexHtmlPath, homepageOutput);
console.log('✓ Homepage pre-render complete');

// ---------------------------------------------------------------------------
// 3. Build per-word HTML pages
//
//    Each page reuses the Vite-processed index.html (which has the correct
//    hashed asset paths) but patches the <head> for word-specific metadata.
// ---------------------------------------------------------------------------
const BASE_URL = 'https://lazydictionary.com';

// Give /play its own HTML so direct visits hydrate the game, not the homepage.
const gameTitle = 'Can you read lazy? — Practice Game | Lazy Dictionary';
const gameDescription = 'Guess the original English spelling from five lazy spellings. Three guesses, optional hints, and no timer. Play a free Lazy Dictionary practice round.';
let gameHtml = template
  .replace(/<title>[^<]*<\/title>/, `<title>${gameTitle}</title>`)
  .replace(/(<meta (?:name|property)="(?:description|og:description|twitter:description)" content=")[^"]*"/g, `$1${gameDescription}"`)
  .replace(/(<meta (?:name|property)="(?:og:title|twitter:title)" content=")[^"]*"/g, `$1${gameTitle}"`)
  .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${BASE_URL}/play"`)
  .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
  .replace('</head>', `    <link rel="canonical" href="${BASE_URL}/play" />\n  </head>`)
  .replace('<div id="root"></div>', `<div id="root">${renderGame()}</div>`);
const gameDir = resolve(root, 'dist/public/play');
mkdirSync(gameDir, { recursive: true });
writeFileSync(resolve(gameDir, 'index.html'), gameHtml);
console.log('✓ Practice game pre-render complete');

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildWordHtml(template, entry, wordHtml) {
  const word        = entry.word;
  const lazy        = entry.lazy;
  const definition  = entry.definition !== '—' ? entry.definition : `The lazy spelling of "${word}" is "${lazy}".`;
  const pos         = entry.partOfSpeech ? ` (${entry.partOfSpeech})` : '';
  const canonical   = `${BASE_URL}/word/${encodeURIComponent(word)}`;

  const title       = `${word} — Lazy Spelling: ${lazy} | Lazy Dictionary`;
  const description = `The lazy spelling of "${word}"${pos} is "${lazy}". Sounds like: ${entry.pronunciation}. ${definition}`.slice(0, 160);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTerm',
        name: word,
        description: definition,
        termCode: lazy,
        inDefinedTermSet: {
          '@type': 'DefinedTermSet',
          name: 'Lazy Dictionary',
          url: `${BASE_URL}/`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Lazy Dictionary',
            item: `${BASE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: word,
            item: canonical,
          },
        ],
      },
    ],
  }, null, 2);

  // Patch the template head — replace title, description, og tags, add canonical
  let html = template;

  // Title
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  );

  // Meta description
  html = html.replace(
    /<meta name="description" content="[^"]*"/,
    `<meta name="description" content="${escapeHtml(description)}"`,
  );

  // og:title
  html = html.replace(
    /<meta property="og:title" content="[^"]*"/,
    `<meta property="og:title" content="${escapeHtml(title)}"`,
  );

  // og:description
  html = html.replace(
    /<meta property="og:description" content="[^"]*"/,
    `<meta property="og:description" content="${escapeHtml(description)}"`,
  );

  // og:url
  html = html.replace(
    /<meta property="og:url" content="[^"]*"/,
    `<meta property="og:url" content="${escapeHtml(canonical)}"`,
  );

  // twitter:title
  html = html.replace(
    /<meta name="twitter:title" content="[^"]*"/,
    `<meta name="twitter:title" content="${escapeHtml(title)}"`,
  );

  // twitter:description
  html = html.replace(
    /<meta name="twitter:description" content="[^"]*"/,
    `<meta name="twitter:description" content="${escapeHtml(description)}"`,
  );

  // Replace existing JSON-LD block with word-specific DefinedTerm
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${jsonLd}\n    </script>`,
  );

  // Add canonical (after the last existing <link rel="icon" ...>)
  html = html.replace(
    /(<link rel="icon"[^>]*>)/,
    `$1\n    <link rel="canonical" href="${escapeHtml(canonical)}" />`,
  );

  // Inject rendered word HTML
  html = html.replace(
    '<div id="root"></div>',
    `<div id="root">${wordHtml}</div>`,
  );

  return html;
}

let wordCount = 0;
for (const entry of dictionary) {
  const slug    = encodeURIComponent(entry.word);
  const wordHtml = renderWord(entry.word);
  const pageHtml = buildWordHtml(template, entry, wordHtml);

  const dir = resolve(root, 'dist/public/word', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), pageHtml);
  wordCount++;
}

console.log(`✓ Generated ${wordCount} per-word pages in dist/public/word/`);

// ---------------------------------------------------------------------------
// 4. Update sitemap.xml with all word URLs
// ---------------------------------------------------------------------------
const today = new Date().toISOString().split('T')[0];

const wordEntries = dictionary
  .map(
    (entry) =>
      `  <url>\n    <loc>${BASE_URL}/word/${encodeURIComponent(entry.word)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`,
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
${wordEntries}
  <url>
    <loc>${BASE_URL}/play</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

writeFileSync(resolve(root, 'dist/public/sitemap.xml'), sitemap);
console.log(`✓ Sitemap updated with ${wordCount + 2} URLs`);


