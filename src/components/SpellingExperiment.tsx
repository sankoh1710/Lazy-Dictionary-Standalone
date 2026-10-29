import { useEffect, useState, type FormEvent } from "react";
import { PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { validateSpellingSubmission } from "@/lib/spellingSubmission";
import { TurnstileChallenge } from "./TurnstileChallenge";

type ConnectionMode = "checking" | "preview" | "local" | "public";

/**
 * Visitor-facing component: one form, one confirmation.
 * Analytics, records and moderation are intentionally in /admin only.
 *
 * Until the public write API is secured and enabled, deployed pages stay in
 * preview mode and NEVER claim a real submission was stored.
 */
export function SpellingExperiment() {
  const [originalWord, setOriginalWord] = useState("");
  const [suggestedSpelling, setSuggestedSpelling] = useState("");
  const [mode, setMode] = useState<ConnectionMode>("checking");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeReset, setChallengeReset] = useState(0);
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
        if (!response.ok) throw new Error("Saving unavailable");
        const result: unknown = await response.json();
        if (controller.signal.aborted) return;
        const available = result !== null &&
          typeof result === "object" &&
          "enabled" in result &&
          result.enabled === true;
        if (!available) {
          setMode("preview");
        } else if ("mode" in result && result.mode === "public" &&
                   "turnstileSiteKey" in result &&
                   typeof result.turnstileSiteKey === "string" &&
                   result.turnstileSiteKey) {
          setTurnstileSiteKey(result.turnstileSiteKey);
          setMode("public");
        } else if ("mode" in result && result.mode === "local") {
          setMode("local");
        } else {
          setMode("preview");
        }
      } catch {
        if (!controller.signal.aborted) setMode("preview");
      }
    }

    void checkAvailability();
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

    if (mode === "preview") {
      setMessage("This is a preview. No spelling was submitted or saved.");
      return;
    }

    if (mode === "public" && !turnstileToken) {
      setError("Complete the verification challenge before submitting.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/spellings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "public"
          ? { ...validated.value, turnstile_token: turnstileToken }
          : validated.value),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail = result !== null &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Unable to submit. Please try again.";
        throw new Error(detail);
      }

      if (result === null || typeof result !== "object" ||
          !("saved" in result) || result.saved !== true ||
          !("submission" in result) || result.submission === null ||
          typeof result.submission !== "object" ||
          !("id" in result.submission) ||
          typeof result.submission.id !== "number") {
        throw new Error("The server did not confirm that your spelling was saved.");
      }

      setOriginalWord("");
      setSuggestedSpelling("");
      setMessage("Your spelling suggestion was saved for review.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit. Try again.");
    } finally {
      if (mode === "public") {
        setTurnstileToken("");
        setChallengeReset((value) => value + 1);
      }
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

            {mode === "public" && turnstileSiteKey && (
              <TurnstileChallenge
                siteKey={turnstileSiteKey}
                onTokenChange={setTurnstileToken}
                resetSignal={challengeReset}
              />
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                disabled={saving || mode === "checking"}
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mode === "checking"
                  ? "Checking availability…"
                  : saving
                    ? "Submitting…"
                    : mode === "local" || mode === "public"
                      ? "Submit spelling"
                      : "Preview spelling"}
              </button>
              <span className="text-xs text-muted-foreground">
                {mode === "public"
                  ? "Suggestions are reviewed before publication"
                  : mode === "local"
                    ? "Local development test · suggestions go to review"
                  : mode === "checking"
                    ? "Checking submission availability"
                    : "Public submissions are not open yet · no data is saved"}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
