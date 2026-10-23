import { useState, type FormEvent } from "react";
import { ArrowRight, PenLine } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface PreviewSubmission {
  originalWord: string;
  suggestedSpelling: string;
}

const spellingPattern = /^[A-Za-z]+(?:['-][A-Za-z]+)*$/;

/**
 * Phase 1 only: submissions live in React memory.
 * No network request, browser storage, or database write occurs here.
 */
export function SpellingExperiment() {
  const [originalWord, setOriginalWord] = useState("");
  const [suggestedSpelling, setSuggestedSpelling] = useState("");
  const [previewSubmissions, setPreviewSubmissions] = useState<PreviewSubmission[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const original = originalWord.trim();
    const suggested = suggestedSpelling.trim();

    if (!original || !suggested) {
      setError("Enter both the English word and your suggested spelling.");
      return;
    }

    if (!spellingPattern.test(original) || !spellingPattern.test(suggested)) {
      setError("Use letters, with optional internal apostrophes or hyphens.");
      return;
    }

    if (original.toLowerCase() === suggested.toLowerCase()) {
      setError("Try a different spelling for the original word.");
      return;
    }

    setPreviewSubmissions((previous) =>
      [{ originalWord: original, suggestedSpelling: suggested }, ...previous].slice(0, 5),
    );
    setOriginalWord("");
    setSuggestedSpelling("");
    setMessage("Preview added. It has not been saved to a database.");
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

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="original-word"
                  className="text-sm font-medium text-foreground"
                >
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
                <label
                  htmlFor="suggested-spelling"
                  className="text-sm font-medium text-foreground"
                >
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
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="submit"
                className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
              >
                Preview my spelling
              </button>
              <span className="text-xs text-muted-foreground">
                Demo only · no information is stored or sent
              </span>
            </div>
          </form>

          <div className="border-t border-border/60 pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Your previews (this page only)
            </h3>
            {previewSubmissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Submit a spelling above to test the form.
              </p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="Previewed spellings">
                {previewSubmissions.map((submission, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap items-center gap-3 rounded-xl bg-secondary/30 px-4 py-3 text-sm"
                  >
                    <span className="font-medium break-all">{submission.originalWord}</span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="font-bold text-primary break-all">
                      {submission.suggestedSpelling}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              These previews disappear if you refresh the page. Database storage
              will be added in a later phase.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
