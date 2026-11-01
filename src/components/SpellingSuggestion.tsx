import { useEffect, useState, type FormEvent } from "react";
import { PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/** Visitors can suggest a spelling; only the owner sees saved rows in Supabase. */
export function SpellingSuggestion() {
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [original, setOriginal] = useState("");
  const [suggested, setSuggested] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/spellings", { cache: "no-store", signal: controller.signal })
      .then(async (res) => res.ok ? await res.json() as unknown : null)
      .then((data) => {
        if (!controller.signal.aborted) {
          setEnabled(!!data && typeof data === "object" &&
            "enabled" in data && data.enabled === true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setEnabled(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || saving) return;
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/spellings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_word: original,
          suggested_spelling: suggested,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = data && typeof data === "object" &&
          "error" in data && typeof data.error === "string"
          ? data.error : "Could not submit. Try again.";
        throw new Error(errorMessage);
      }
      if (!data || typeof data !== "object" ||
          !("saved" in data) || data.saved !== true) {
        throw new Error("Save could not be confirmed.");
      }
      setOriginal("");
      setSuggested("");
      setMessage("Thank you. Your spelling suggestion was received.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="suggest-spelling-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 ml-2">
        <PenLine className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id="suggest-spelling-title" className="text-2xl font-semibold">
          Suggest a spelling
        </h2>
      </div>
      <Card className="border-border/60 rounded-2xl bg-card">
        <CardContent className="p-6 sm:p-8">
          <p className="text-sm text-muted-foreground mb-5">
            How would you spell an English word? For example: phone → fon.
          </p>
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="original-spelling" className="text-sm font-medium">
                  English word
                </label>
                <Input
                  id="original-spelling"
                  value={original}
                  maxLength={60}
                  required
                  autoComplete="off"
                  placeholder="Phone"
                  onChange={(event) => setOriginal(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="suggested-spelling" className="text-sm font-medium">
                  Your spelling
                </label>
                <Input
                  id="suggested-spelling"
                  value={suggested}
                  maxLength={60}
                  required
                  autoComplete="off"
                  placeholder="Fon"
                  onChange={(event) => setSuggested(event.target.value)}
                />
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={checking || !enabled || saving}
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                {checking ? "Checking…" : saving ? "Submitting…" : "Submit spelling"}
              </button>
              {!checking && !enabled && (
                <span className="text-xs text-muted-foreground">Submissions are not open yet.</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
