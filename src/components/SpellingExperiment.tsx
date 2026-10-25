import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { validateSpellingSubmission } from "@/lib/spellingSubmission";
import { SpellingRecords } from "./SpellingRecords";
import { SpellingAnalytics } from "./SpellingAnalytics";

type ConnectionMode = "checking" | "preview" | "database";

interface RecentSubmission {
  originalWord: string;
  suggestedSpelling: string;
  saved: boolean;
  id?: number;
}

export function SpellingExperiment() {
  const [originalWord, setOriginalWord] = useState("");
  const [suggestedSpelling, setSuggestedSpelling] = useState("");
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);
  const [mode, setMode] = useState<ConnectionMode>("checking");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [savedVersion, setSavedVersion] = useState(0);

  // Vite alone serves only the frontend. The database mode becomes available
  // when the Vercel API reports that it is deliberately enabled and configured.
  useEffect(() => {
    const controller = new AbortController();

    async function checkConnection() {
      try {
        const response = await fetch("/api/spellings", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("API unavailable");
        const result: unknown = await response.json();
        if (controller.signal.aborted) return;
        const available =
          typeof result === "object" &&
          result !== null &&
          "enabled" in result &&
          result.enabled === true;
        setMode(available ? "database" : "preview");
      } catch {
        if (!controller.signal.aborted) setMode("preview");
      }
    }

    void checkConnection();
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || mode === "checking") return;
    setError("");
    setMessage("");

    const validated = validateSpellingSubmission({
      original_word: originalWord,
      suggested_spelling: suggestedSpelling,
    });

    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    const addRecent = (saved: boolean, id?: number) => {
      setRecentSubmissions((previous) =>
        [
          {
            originalWord: validated.value.original_word,
            suggestedSpelling: validated.value.suggested_spelling,
            saved,
            id,
          },
          ...previous,
        ].slice(0, 5),
      );
      setOriginalWord("");
      setSuggestedSpelling("");
    };

    if (mode === "preview") {
      addRecent(false);
      setMessage("Preview added. No data has been sent or saved.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/spellings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.value),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to save. Please try again.";
        throw new Error(detail);
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !("saved" in result) ||
        result.saved !== true ||
        !("submission" in result) ||
        typeof result.submission !== "object" ||
        result.submission === null ||
        !("id" in result.submission) ||
        typeof result.submission.id !== "number"
      ) {
        throw new Error("The database did not confirm the saved record.");
      }

      addRecent(true, result.submission.id);
      setSavedVersion((version) => version + 1);
      setMessage("Saved to PostgreSQL. Check the row in your Supabase SQL Editor.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="spelling-experiment"
      aria-labelledby="spelling-experiment-heading"
      className="flex flex-col gap-6 scroll-mt-20"
    >
      <div className="flex items-center gap-3 ml-2">
        <PenLine className="h-6 w-6 text-primary" aria-hidden="true" />
        <h2
          id="spelling-experiment-heading"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          Spelling Experiment
        </h2>
      </div>

      <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="space-y-2">
            <p className="text-foreground font-medium">
              How would you spell an English word?
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suggest your own spelling. You do not have to follow the Lazy
              Alphabet rules. For example: enough → enuf.
            </p>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="original-word" className="text-sm font-medium text-foreground">
                  Original English word
                </label>
                <Input
                  id="original-word"
                  value={originalWord}
                  onChange={(event) => {
                    setOriginalWord(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="Enough"
                  maxLength={60}
                  autoComplete="off"
                  className="h-12 rounded-xl bg-background"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="suggested-spelling" className="text-sm font-medium text-foreground">
                  Your suggested spelling
                </label>
                <Input
                  id="suggested-spelling"
                  value={suggestedSpelling}
                  onChange={(event) => {
                    setSuggestedSpelling(event.target.value);
                    setError("");
                    setMessage("");
                  }}
                  placeholder="Enuf"
                  maxLength={60}
                  autoComplete="off"
                  className="h-12 rounded-xl bg-background"
                />
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                disabled={saving || mode === "checking"}
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === "checking"
                  ? "Checking connection…"
                  : saving
                    ? "Saving…"
                    : mode === "database"
                      ? "Save spelling"
                      : "Preview my spelling"}
              </button>
              <span className="text-xs text-muted-foreground">
                {mode === "database"
                  ? "Database test mode · saves to Supabase"
                  : mode === "checking"
                    ? "Checking whether database writes are enabled"
                    : "Preview mode · nothing is stored or sent"}
              </span>
            </div>
          </form>

          <div className="border-t border-border/60 pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Recent submissions in this browser
            </h3>
            {recentSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Submit a spelling above to test the form.
              </p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Recent spellings">
                {recentSubmissions.map((submission, index) => (
                  <li
                    key={submission.id ?? `preview-${index}`}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3 text-sm"
                  >
                    <span className="font-medium break-all">{submission.originalWord}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="font-bold text-primary break-all">
                      {submission.suggestedSpelling}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {submission.saved ? `Saved · #${submission.id}` : "Preview only"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              This list resets on refresh. Records marked "Saved" stay in PostgreSQL.
            </p>
          </div>
        </CardContent>
      </Card>
      {mode === "database" && (
        <>
          <SpellingAnalytics refreshToken={savedVersion} />
          <SpellingRecords refreshToken={savedVersion} />
        </>
      )}
    </section>
  );
}
