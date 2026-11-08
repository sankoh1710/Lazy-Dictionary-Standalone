import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, PenLine, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { firstRound, gameWords } from "../data/gameWords";
import { createGame, gameReducer, MAX_GUESSES, sampleRound } from "../lib/game";

const actionClass = "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-base font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";
const linkClass = "inline-flex min-h-11 items-center justify-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

export function GamePage() {
  const [state, dispatch] = useReducer(gameReducer, firstRound, createGame);
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const complete = state.index === state.words.length;
  const word = state.words[state.index];
  const score = state.results.filter((result) => result.outcome === "correct").length;

  useEffect(() => {
    if (complete) resultRef.current?.focus();
    else if (state.outcome) nextRef.current?.focus();
    else if (state.index > 0) inputRef.current?.focus();
  }, [state.index, state.outcome, complete]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: "guess", value: answer });
  }

  function next() {
    setAnswer("");
    dispatch({ type: "next" });
  }

  function restart() {
    setAnswer("");
    dispatch({ type: "restart", words: sampleRound(gameWords) });
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans flex flex-col">
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
        <header className="text-center flex flex-col items-center gap-4">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Lazy Dictionary</h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">English words, spelled the way they sound.</p>
          <nav aria-label="Main" className="flex gap-2 mt-3">
            <a href="/" className="rounded-full px-5 py-3 bg-secondary/60 text-sm font-medium hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary">Dictionary</a>
            <a href="/play" aria-current="page" className="rounded-full px-5 py-3 bg-foreground text-background text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Practice game</a>
          </nav>
        </header>

        <section aria-labelledby="game-title" className="max-w-2xl mx-auto mt-10 sm:mt-12">
          <div className="text-center mb-7 sm:mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">The Daily Lazy · Practice round</p>
            <h2 id="game-title" className="text-3xl sm:text-4xl font-semibold tracking-tight mt-3">Can you read lazy?</h2>
            <p className="text-muted-foreground mt-3">Same word. Less spelling drama.</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 sm:p-10">
            {complete ? (
              <div className="text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Round complete</p>
                <h3 ref={resultRef} tabIndex={-1} className="text-6xl font-semibold tracking-tight mt-5 focus:outline-none">{score}<span className="text-muted-foreground/60 text-3xl"> / 5</span></h3>
                <p className="text-xl font-semibold mt-4">{score === 5 ? "You speak fluent lazy." : score >= 3 ? "You’re getting the hang of lazy." : "English spelling put up a fight."}</p>
                <p className="text-sm text-muted-foreground mt-2">Here’s how your five words went.</p>
                <ul className="text-left mt-7 divide-y divide-border/40">
                  {state.results.map((result) => (
                    <li key={result.word.original} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span><span className="text-muted-foreground">{result.word.lazy}</span><span aria-hidden="true"> → </span><span className="font-semibold">{result.word.original}</span></span>
                      <span className="text-muted-foreground text-xs">{result.outcome === "correct" ? `Solved${result.hintUsed ? " · with hint" : ""} · ${result.attempts} ${result.attempts === 1 ? "guess" : "guesses"}` : result.outcome === "skipped" ? "Skipped" : "Revealed"}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={restart} className={`${actionClass} mt-7 w-full sm:w-auto`}><RotateCcw className="h-4 w-4" aria-hidden="true" />Play another round</button>
                <p className="text-xs text-muted-foreground mt-4">Practice as much as you like. Daily challenges are coming later.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                  <span>Word {state.index + 1} of 5</span>
                  <ol aria-label="Round progress" className="flex gap-2">
                    {state.words.map((item, index) => (
                      <li key={item.original} aria-current={index === state.index ? "step" : undefined} aria-label={`Word ${index + 1}: ${index < state.results.length ? state.results[index].outcome : index === state.index ? "current" : "upcoming"}`} className={`h-3 w-3 rounded-full ${index <= state.index ? "bg-foreground" : "bg-muted/60"} ${index === state.index ? "ring-2 ring-offset-2 ring-border ring-offset-card" : ""}`} />
                    ))}
                  </ol>
                </div>
                <div className="text-center mt-9 mb-7">
                  <h3 className="text-[clamp(2.25rem,9vw,4.5rem)] leading-tight uppercase font-bold tracking-tight break-words">{word.lazy}</h3>
                  <p className="text-muted-foreground mt-3">What’s the original spelling?</p>
                </div>

                {!state.outcome ? (
                  <>
                    <form onSubmit={submit} className="flex flex-col gap-4">
                      <label htmlFor="game-answer" className="text-sm font-medium">Your answer</label>
                      <Input ref={inputRef} id="game-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type the original word…" autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} maxLength={60} aria-describedby="game-attempts game-feedback" className="h-14 rounded-xl bg-card border-border/70 text-base shadow-sm focus-visible:ring-primary/40" />
                      <p id="game-attempts" className="text-xs text-muted-foreground">{MAX_GUESSES - state.guesses.length} {MAX_GUESSES - state.guesses.length === 1 ? "guess" : "guesses"} remaining</p>
                      <p id="game-feedback" role="status" className="text-sm text-muted-foreground empty:hidden">{state.feedback}</p>
                      {state.guesses.length > 0 && <p className="text-xs text-muted-foreground break-words">Tried: {state.guesses.join(", ")}</p>}
                      <button type="submit" className={`${actionClass} w-full sm:w-auto sm:self-center sm:min-w-72`}>Check answer<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                    </form>
                    <div className="flex justify-center gap-6 mt-2">
                      <button type="button" className={linkClass} onClick={() => dispatch({ type: "hint" })} aria-expanded={state.hintUsed} aria-controls="game-hint">{state.hintUsed ? "Hint shown" : "Need a hint?"}</button>
                      <button type="button" className={linkClass} onClick={() => dispatch({ type: "skip" })}>Skip word</button>
                    </div>
                    {state.hintUsed && <p id="game-hint" role="status" className="rounded-xl bg-secondary/50 p-4 mt-3 text-sm text-center text-foreground/80">{word.hint}</p>}
                  </>
                ) : (
                  <div className="text-center">
                    <div role="status" className="rounded-xl bg-secondary/40 p-5">
                      <p className="font-semibold flex items-center justify-center gap-2">{state.outcome === "correct" ? <><Check className="h-5 w-5" aria-hidden="true" />Correct!{state.hintUsed ? " With a little help." : ""}</> : state.outcome === "skipped" ? "Skipped. Here’s the original." : "Out of guesses. Here’s the original."}</p>
                      <p className="mt-2 text-lg break-words">{word.lazy} → <strong>{word.original}</strong></p>
                      <p className="text-sm text-muted-foreground mt-2">{word.hint}</p>
                    </div>
                    <button ref={nextRef} type="button" onClick={next} className={`${actionClass} mt-6 w-full sm:w-auto`}>{state.index === 4 ? "See results" : "Next word"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-5">No timer. No pressure. Just words.</p>
          <details className="text-sm text-muted-foreground mt-5 text-center">
            <summary className="cursor-pointer min-h-11 inline-flex items-center underline underline-offset-4">How to play</summary>
            <p className="text-left bg-secondary/40 rounded-xl p-4 mt-2 leading-relaxed">Read the lazy spelling and type the original English word. You have three guesses per word. Hints reveal a meaning clue; skipped words reveal the answer. Capitals and extra spaces don’t matter. Your score is the number of words solved, with hints noted separately. This practice round resets if you refresh.</p>
          </details>
          <a href="/#suggest-spelling-title" className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card border border-border/60 p-5 sm:p-6 shadow-sm hover:border-primary/50 transition-colors focus-visible:outline-2 focus-visible:outline-primary">
            <div className="flex items-start gap-3"><PenLine className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" /><div><p className="font-semibold">Suggest a spelling</p><p className="text-sm text-muted-foreground mt-1">Got a different way to spell it?</p></div></div>
            <span className="text-sm text-muted-foreground underline underline-offset-4">Submit your version →</span>
          </a>
        </section>
      </main>
      <footer className="py-8 px-4 text-center text-sm text-muted-foreground border-t border-border/40">An experiment in readable spelling.</footer>
    </div>
  );
}
