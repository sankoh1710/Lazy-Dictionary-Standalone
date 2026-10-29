import { useEffect, useState, type FormEvent } from "react";
import { Database, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface SpellingRecord {
  id: number;
  original_word: string;
  suggested_spelling: string;
  created_at: string;
}

interface RecordsResponse {
  records: SpellingRecord[];
  total: number | null;
  filter: string | null;
  sort: "recent" | "oldest";
}

function isRecordsResponse(data: unknown): data is RecordsResponse {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return false;
  const object = data as Record<string, unknown>;
  return (
    Array.isArray(object.records) &&
    object.records.every((entry: unknown) => {
      if (typeof entry !== "object" || entry === null) return false;
      const row = entry as Record<string, unknown>;
      return (
        typeof row.id === "number" &&
        typeof row.original_word === "string" &&
        typeof row.suggested_spelling === "string" &&
        typeof row.created_at === "string"
      );
    }) &&
    (object.total === null || typeof object.total === "number")
  );
}

/**
 * Local development only. Renders only when the parent confirms that the
 * database API is enabled. A backend gate independently blocks public access.
 */
export function SpellingRecords({ refreshToken, token }: { refreshToken: number; token: string }) {
  const [wordInput, setWordInput] = useState("");
  const [activeWord, setActiveWord] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [refreshCount, setRefreshCount] = useState(0);
  const [records, setRecords] = useState<SpellingRecord[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchRecords() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ sort, limit: "20" });
      if (activeWord) params.set("word", activeWord);

      try {
        const response = await fetch("/api/spelling-records?" + params.toString(), {
          headers: { Authorization: "Bearer " + token },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Could not load saved spellings. Check your local API.");
        const data: unknown = await response.json();
        if (!isRecordsResponse(data)) throw new Error("Unexpected response from the database API.");
        if (!controller.signal.aborted) {
          setRecords(data.records);
          setTotal(data.total);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Could not load spellings.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchRecords();
    return () => controller.abort();
  }, [activeWord, sort, refreshToken, refreshCount, token]);

  const applyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveWord(wordInput.trim().toLowerCase());
    setRefreshCount((count) => count + 1);
  };

  return (
    <section aria-labelledby="saved-spellings-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 ml-2">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 id="saved-spellings-heading" className="text-xl font-semibold">
            Saved spellings — database viewer
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          Local development only · read-only
        </span>
      </div>

      <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="p-5 sm:p-7 flex flex-col gap-5">
          <form onSubmit={applyFilter} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <label htmlFor="filter-original-word" className="text-sm font-medium">
                Filter by original word
              </label>
              <Input
                id="filter-original-word"
                value={wordInput}
                onChange={(event) => setWordInput(event.target.value)}
                placeholder="e.g. enough (leave blank for all)"
                maxLength={60}
                className="h-11 rounded-xl bg-background"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="sort-spellings" className="text-sm font-medium">
                Order
              </label>
              <select
                id="sort-spellings"
                value={sort}
                onChange={(event) => setSort(event.target.value as "recent" | "oldest")}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="recent">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground px-4 font-semibold disabled:opacity-50"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              Filter
            </button>
            <button
              type="button"
              onClick={() => setRefreshCount((count) => count + 1)}
              disabled={loading}
              aria-label="Refresh saved spellings"
              title="Refresh"
              className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-border bg-background hover:bg-secondary/50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </button>
          </form>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Matching submissions</p>
              <p className="text-2xl font-semibold" aria-live="polite">
                {loading ? "…" : total ?? "—"}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Rows returned (limit 20)</p>
              <p className="text-2xl font-semibold">{loading ? "…" : records.length}</p>
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">Loading saved rows…</p>
          ) : !error && records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No records found. Try another word or clear the filter.
            </p>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th scope="col" className="py-2 px-2 font-semibold">ID</th>
                    <th scope="col" className="py-2 px-2 font-semibold">Original</th>
                    <th scope="col" className="py-2 px-2 font-semibold">Suggestion</th>
                    <th scope="col" className="py-2 px-2 font-semibold">Created (local time)</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-border/50">
                      <td className="py-3 px-2 text-muted-foreground">#{record.id}</td>
                      <td className="py-3 px-2 font-medium break-all">{record.original_word}</td>
                      <td className="py-3 px-2 text-primary font-semibold break-all">
                        {record.suggested_spelling}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {new Date(record.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">
            This viewer reads your PostgreSQL table using a server API. It does not
            modify or delete records. Try filtering by "enough" and compare the
            result with a SQL SELECT query in Supabase.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
