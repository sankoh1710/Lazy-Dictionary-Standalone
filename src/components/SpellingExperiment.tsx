import { useEffect, useState, type FormEvent } from "react";
import { PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { validateSpellingSubmission } from "@/lib/spellingSubmission";

type ConnectionMode = "checking" | "disabled" | "enabled";

/**
 * Visitor-facing MVP: a two-field spelling suggestion form.
 * Administration, analytics, records, and audit logs are not exposed here.
 *
 * The server decides whether submissions are enabled. A browser-only flag
 * can never grant database write access.
 */
export function SpellingExperiment() {
  const [originalWord, setOriginalWord] = useState("");
  const [suggestedSpelling, setSuggestedSpelling] = useState("");
  const [mode, setMode] = useState<ConnectionMode>("checking");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function checkAvailability() {
      try {
        const response = await fetch("/api/spellings", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("API unavailable");
        const data: unknown = await response.json();
        if (controller.signal.aborted) return;
        const enabled = !!data && typeof data === "object" &&
          "enabled" in data && data.enabled === true;
        setMode(enabled ? "enabled" : "disabled");
      } catch {
        if (!controller.signal.aborted) setMode("disabled");
      }
    }

    void checkAvailability();
    return () => controller.abort();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving || mode !== "enabled") return;
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

    setSaving(true);
    try {
      const response = await fetch("/api/spellings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.value),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail = !!result && typeof result === "object" &&
          "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to submit. Please try again.";
        throw new Error(detail);
      }

      if (!result || typeof result !== "object" ||
          !("saved" in result) || result.saved !== true ||
          !("submission" in result) || !result.submission ||
          typeof result.submission !== "object" ||
          !("id" in result.submission) ||
          typeof result.submission.id !== "number") {
        throw new Error("The server did not confirm that the suggestion was saved.");
      }

      setOriginalWord("");
      setSuggestedSpelling("");
      setMessage("Thanks. Your spelling suggestion was received and is awaiting review.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit. Please try again.");
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
        <h2 id="spelling-experiment-heading" className="text-2xl font-semibold tracking-tight">
          Suggest a spelling
        </h2>
      </div>

      <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="p-6 sm:p-8 flex flex-col gap-6">
          <div className="space-y-2">
            <p className="font-medium">How would you spell an English word?</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suggest your own spelling. You don't have to follow the Lazy
              Alphabet rules. For example: enough → enuf.
            </p>
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="original-word" className="text-sm font-medium">
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
                <label htmlFor="suggested-spelling" className="text-sm font-medium">
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

            {mode === "enabled" && (
              <p className="text-xs text-muted-foreground">
                Please submit words only, not personal information.
              </p>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                disabled={saving || mode !== "enabled"}
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === "checking"
                  ? "Checking availability…"
                  : saving
                    ? "Submitting…"
                    : "Submit spelling"}
              </button>
              <span className="text-xs text-muted-foreground">
                {mode === "checking"
                  ? "Checking availability"
                  : mode === "disabled"
                    ? "Submissions are not open yet"
                    : "Suggestions are reviewed manually"}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
