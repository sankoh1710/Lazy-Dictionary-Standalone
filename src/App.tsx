import { useState, useEffect } from "react";
import { Search, ArrowRight, BookOpen, Info, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toLazy } from "./lib/lazySpell";
import { SpellingExperiment } from "./components/SpellingExperiment";
import { lookupWord, dictionary, DictionaryEntry } from "./data/dictionary";

// Randomly sample n words from the dictionary
function sampleWords(n: number): string[] {
  const shuffled = [...dictionary].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n).map((e) => e.word);
}

interface SearchResult {
  entry: DictionaryEntry;
  isAlgorithmic: boolean;
}

function App() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  // Chips are intentionally client-only: they're random per load and not
  // meaningful SEO content, so we avoid a server/client hydration mismatch.
  const [chipWords, setChipWords] = useState<string[]>([]);
  useEffect(() => {
    setChipWords(sampleWords(10));
  }, []);

  const resolveResult = (word: string): SearchResult => {
    const entry = lookupWord(word);
    if (entry) {
      return { entry, isAlgorithmic: false };
    }
    const w = word.trim();
    return {
      entry: {
        word: w.toLowerCase(),
        lazy: toLazy(w),
        definition: "—",
        pronunciation: "—",
        partOfSpeech: "",
      },
      isAlgorithmic: true,
    };
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setResult(resolveResult(query));
    setSearched(true);
  };

  const handleChipClick = (word: string) => {
    setQuery(word);
    setResult(resolveResult(word));
    setSearched(true);
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary-foreground">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-24 flex flex-col gap-12 sm:gap-16">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            Lazy Dictionary
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground/70 font-medium">
            English words, spelled the way they sound.
          </p>
        </header>

        {/* Search */}
        <section className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-700 delay-150 fill-mode-both">
          <form onSubmit={handleSearch} className="relative group w-full">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
            </div>
            <Input
              className="w-full pl-14 pr-14 h-16 sm:h-20 text-lg sm:text-xl rounded-2xl border-2 border-border/60 bg-card shadow-sm hover:border-primary/40 focus-visible:ring-0 focus-visible:border-primary transition-all placeholder:text-muted-foreground/40 font-medium"
              aria-label="Look up a word"
              placeholder="Try a word…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearched(false);
              }}
            />
            <button
              type="submit"
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-muted-foreground/50 hover:text-primary transition-colors cursor-pointer"
              aria-label="Search"
            >
              <ArrowRight className="h-6 w-6" />
            </button>
          </form>

          {/* Chips — client-only; empty during SSR to avoid hydration mismatch */}
          <div className="flex flex-wrap justify-center gap-2" suppressHydrationWarning>
            {chipWords.map((w) => (
              <button
                key={w}
                onClick={() => handleChipClick(w)}
                className="px-4 py-2 rounded-full bg-secondary/60 text-secondary-foreground text-sm font-medium hover:bg-primary hover:text-primary-foreground transition-all duration-200 active:scale-95"
              >
                {w}
              </button>
            ))}
          </div>
        </section>

        {/* Result Area — full width of max-w-4xl, not constrained by max-w-2xl */}
        <section className="w-full min-h-[200px] flex flex-col justify-center">
          {searched && result && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out flex flex-col gap-3">
              {result.isAlgorithmic && (
                <div className="flex items-center gap-2 px-1">
                  <Wand2 className="h-4 w-4 text-muted-foreground/60" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Auto-converted — not in hand-verified dictionary
                  </span>
                </div>
              )}
              <Card className={`border shadow-lg bg-card overflow-hidden rounded-2xl ${result.isAlgorithmic ? "border-dashed border-border/60" : "border-border/80"}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
                  <ResultField label="Standard" value={result.entry.word} />
                  <ResultField label="Lazy" value={result.entry.lazy} isLazy />
                  <ResultField
                    label="Meaning"
                    value={result.entry.definition}
                    isLong
                    isDim={result.isAlgorithmic}
                  />
                  <ResultField
                    label="Sounds like"
                    value={result.entry.pronunciation}
                    isDim={result.isAlgorithmic}
                  />
                </div>
              </Card>
            </div>
          )}
        </section>

        {/* Spelling submissions and local database exploration. */}
        <SpellingExperiment />

        {/* The Lazy Alphabet */}
        <section className="mt-8 flex flex-col gap-6 animate-in fade-in duration-1000 delay-300 fill-mode-both">
          <div className="flex items-center gap-3 ml-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              The Lazy Alphabet
            </h2>
          </div>

          <Card className="bg-secondary/20 border-border/60 rounded-2xl overflow-hidden shadow-sm">
            <CardContent className="p-8 sm:p-10 flex flex-col gap-12">
              <div className="flex flex-col gap-8">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                    Standard
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-3 text-xl sm:text-2xl font-medium text-foreground/40">
                    {"A B C D E F G H I J K L M N O P Q R S T U V W X Y Z"
                      .split(" ")
                      .map((l) => (
                        <span key={`std-${l}`} className="px-1">
                          {l}
                        </span>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                    Lazy
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-3 text-xl sm:text-2xl font-medium text-foreground">
                    {"A B D E F G H I J K L M N O P R S SH T TH U V W Y Z CH NG ZH"
                      .split(" ")
                      .map((l) => (
                        <span key={`lazy-${l}`} className="px-1">
                          {l}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground bg-background/50 p-4 rounded-lg border border-border/40 inline-flex">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Note: <strong>C</strong>, <strong>Q</strong>, and{" "}
                    <strong>X</strong> are not used. Their sounds are covered by{" "}
                    <strong>K</strong>, <strong>S</strong>, <strong>KW</strong>,
                    and <strong>Z</strong>.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/60 pt-10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
                  Key Rules
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <Rule original="ph" lazy="f" example="phone → fon" />
                  <Rule original="ck" lazy="k" example="back → bak" />
                  <Rule
                    original="c (before e/i/y)"
                    lazy="s"
                    example="city → siti"
                  />
                  <Rule original="c (other)" lazy="k" example="cat → kat" />
                  <Rule original="qu" lazy="kw" example="queen → kween" />
                  <Rule original="x" lazy="ks" example="fox → foks" />
                  <Rule
                    original="gh (silent)"
                    lazy="drop"
                    example="night → nyt"
                  />
                  <Rule original="kn" lazy="n" example="knife → nyf" />
                  <Rule original="wr" lazy="r" example="write → ryt" />
                  <Rule original="wh" lazy="w" example="where → wer" />
                  <Rule original="tion" lazy="shon" example="nation → nashon" />
                  <Rule
                    original="ough"
                    lazy="oo/uf/ot"
                    example="through → throo"
                  />
                  <Rule
                    original="double letters"
                    lazy="single"
                    example="butter → buter"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Browse all words — rendered server-side so all 200+ entries are
            visible to Googlebot and other crawlers without JS interaction. */}
        <section
          id="browse"
          className="flex flex-col gap-6 animate-in fade-in duration-1000 delay-500 fill-mode-both"
        >
          <div className="flex items-center gap-3 ml-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Browse all words
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {dictionary.map((entry) => (
              <a
                key={entry.word}
                href={`/word/${encodeURIComponent(entry.word)}`}
                className="px-3 py-2.5 rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:bg-secondary/20 transition-colors flex flex-col gap-0.5 group"
              >
                <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                  {entry.word}
                </span>
                <span className="text-xs font-bold text-primary">
                  {entry.lazy}
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="w-full py-8 text-center text-sm font-medium text-muted-foreground/60 border-t border-border/40">
        An experiment in readable spelling.
      </footer>
    </div>
  );
}

function ResultField({
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

function Rule({
  original,
  lazy,
  example,
}: {
  original: string;
  lazy: string;
  example: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-card border border-border/50 shadow-sm hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-foreground">{original}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="font-bold text-primary">{lazy}</span>
      </div>
      <div className="text-sm text-muted-foreground font-medium">{example}</div>
    </div>
  );
}

export default App;

