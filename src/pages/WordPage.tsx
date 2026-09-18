import { useParams } from "wouter";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { lookupWord, DictionaryEntry } from "../data/dictionary";
import { toLazy } from "../lib/lazySpell";

// Pure presentational component — same output on server and client given the
// same props, so React's hydration check passes cleanly.
export function WordPageContent({
  entry,
  isAlgorithmic,
}: {
  entry: DictionaryEntry;
  isAlgorithmic: boolean;
}) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary-foreground">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col gap-10">
        {/* Back link */}
        <div>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Lazy Dictionary
          </a>
        </div>

        {/* Word heading */}
        <header className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            {entry.word}
          </h1>
          {entry.partOfSpeech && (
            <p className="text-sm italic text-muted-foreground">
              {entry.partOfSpeech}
            </p>
          )}
        </header>

        {/* Word card */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out flex flex-col gap-3">
          {isAlgorithmic && (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
              Auto-converted — not in hand-verified dictionary
            </p>
          )}
          <Card
            className={`border shadow-lg bg-card overflow-hidden rounded-2xl ${
              isAlgorithmic
                ? "border-dashed border-border/60"
                : "border-border/80"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
              <WordField label="Standard" value={entry.word} />
              <WordField label="Lazy" value={entry.lazy} isLazy />
              <WordField
                label="Meaning"
                value={entry.definition}
                isLong
                isDim={isAlgorithmic}
              />
              <WordField
                label="Sounds like"
                value={entry.pronunciation}
                isDim={isAlgorithmic}
              />
            </div>
          </Card>
        </div>

        {/* Search another word */}
        <section className="flex flex-col gap-4 pt-4 border-t border-border/40">
          <h2 className="text-base font-semibold text-foreground">
            Search another word
          </h2>
          <form action="/" className="flex gap-3 items-center">
            <input
              type="text"
              name="q"
              placeholder="Try a word…"
              className="flex-1 px-5 py-3 rounded-xl border-2 border-border/60 bg-card text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary font-medium text-base transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2 shrink-0"
            >
              Look up
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>
      </main>

      <footer className="w-full py-8 text-center text-sm font-medium text-muted-foreground/60 border-t border-border/40">
        An experiment in readable spelling.
      </footer>
    </div>
  );
}

function WordField({
  label,
  value,
  isLazy,
  isLong,
  isDim,
}: {
  label: string;
  value: string;
  isLazy?: boolean;
  isLong?: boolean;
  isDim?: boolean;
}) {
  return (
    <div className="p-5 sm:p-6 flex flex-col gap-2 min-w-0">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      <span
        className={`
          break-words min-w-0 w-full
          ${isLazy ? "text-2xl sm:text-3xl text-primary font-bold tracking-tight" : ""}
          ${isLong ? "text-sm sm:text-base leading-snug font-normal" : ""}
          ${!isLazy && !isLong ? "text-lg sm:text-xl font-medium" : ""}
          ${isDim ? "text-muted-foreground/50" : isLong ? "text-foreground/80" : "text-foreground"}
        `}
      >
        {value}
      </span>
    </div>
  );
}

// SPA route component — reads slug from URL, looks up the entry.
export function WordPage() {
  const { slug } = useParams<{ slug: string }>();
  const decoded = decodeURIComponent(slug ?? "");
  const entry = lookupWord(decoded);

  if (entry) {
    return <WordPageContent entry={entry} isAlgorithmic={false} />;
  }

  // Algorithmic fallback for words not in the curated dictionary
  return (
    <WordPageContent
      entry={{
        word: decoded.toLowerCase(),
        lazy: toLazy(decoded),
        definition: "—",
        pronunciation: "—",
        partOfSpeech: "",
      }}
      isAlgorithmic={true}
    />
  );
}

