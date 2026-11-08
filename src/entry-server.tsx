import { renderToString } from 'react-dom/server';
import App from './App';
import { WordPageContent } from './pages/WordPage';
import { lookupWord, dictionary } from './data/dictionary';
import { toLazy } from './lib/lazySpell';
import { GamePage } from './pages/GamePage';

export function renderGame(): string {
  return renderToString(<GamePage />);
}

export function render(): string {
  return renderToString(<App />);
}

export function renderWord(slug: string): string {
  const decoded = decodeURIComponent(slug);
  const entry = lookupWord(decoded);

  if (entry) {
    return renderToString(<WordPageContent entry={entry} isAlgorithmic={false} />);
  }

  return renderToString(
    <WordPageContent
      entry={{
        word: decoded.toLowerCase(),
        lazy: toLazy(decoded),
        definition: '—',
        pronunciation: '—',
        partOfSpeech: '',
      }}
      isAlgorithmic={true}
    />,
  );
}

// Export dictionary so prerender.mjs can enumerate all words without a
// separate TypeScript compilation step.
export { dictionary };


