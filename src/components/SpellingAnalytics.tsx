import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface WordStat {
  word: string;
  submissions: number;
  unique_spellings: number;
}

interface AlternativeStat {
  original_word: string;
  suggested_spelling: string;
  submissions: number;
}

interface DailyStat {
  day: string;
  submissions: number;
}

interface AnalyticsData {
  total_submissions: number;
  unique_words: number;
  unique_alternatives: number;
  top_words: WordStat[];
  top_spellings: AlternativeStat[];
  daily_submissions: DailyStat[];
}

function isAnalyticsData(data: unknown): data is AnalyticsData {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return false;
  const object = data as Record<string, unknown>;
  return (
    typeof object.total_submissions === "number" &&
    typeof object.unique_words === "number" &&
    typeof object.unique_alternatives === "number" &&
    Array.isArray(object.top_words) &&
    Array.isArray(object.top_spellings) &&
    Array.isArray(object.daily_submissions)
  );
}

function DistributionBar({
  label,
  count,
  max,
  detail,
}: {
  label: string;
  count: number;
  max: number;
  detail?: string;
}) {
  return (
    <li className="space-y-2 min-w-0">
      <div className="flex justify-between items-baseline gap-3 text-sm">
        <div className="min-w-0">
          <span className="font-medium text-foreground break-all">{label}</span>
          {detail && <span className="text-xs text-muted-foreground ml-2">{detail}</span>}
        </div>
        <span className="tabular-nums text-muted-foreground shrink-0">{count}</span>
      </div>
      <div className="h-2.5 bg-secondary/70 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${Math.round((count / Math.max(max, 1)) * 100)}%` }}
        />
      </div>
    </li>
  );
}

/**
 * Analytics stays in local development. All aggregates come from PostgreSQL,
 * and a successful spelling save triggers an automatic refresh.
 */
export function SpellingAnalytics({ refreshToken, token }: { refreshToken: number; token: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [manualRefresh, setManualRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/spelling-analytics", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          signal: controller.signal,
        });

        const result: unknown = await response.json();
        if (!response.ok) {
          const detail = result && typeof result === "object" &&
            "error" in result && typeof result.error === "string"
              ? result.error
              : "Could not load analytics.";
          throw new Error(detail);
        }
        if (!isAnalyticsData(result)) throw new Error("Unexpected analytics format.");
        if (!controller.signal.aborted) setData(result);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(cause instanceof Error ? cause.message : "Could not load analytics.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [refreshToken, manualRefresh, token]);

  const biggestWord = Math.max(1, ...(data?.top_words.map((row) => row.submissions) ?? []));
  const biggestAlternative = Math.max(
    1, ...(data?.top_spellings.map((row) => row.submissions) ?? []),
  );
  const biggestDay = Math.max(
    1, ...(data?.daily_submissions.map((row) => row.submissions) ?? []),
  );

  return (
    <section aria-labelledby="spelling-analytics-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 ml-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 id="spelling-analytics-heading" className="text-xl font-semibold">
            Spelling analytics
          </h3>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setManualRefresh((value) => value + 1)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-secondary/50 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh statistics
        </button>
      </div>

      <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="p-5 sm:p-7 flex flex-col gap-6">
          <p className="text-xs text-muted-foreground">
            Local database analysis · PostgreSQL COUNT, DISTINCT and GROUP BY
          </p>

          {loading && <p role="status" className="text-sm text-muted-foreground">Calculating statistics…</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

          {data && !loading && !error && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total submissions", value: data.total_submissions },
                  { label: "Unique original words", value: data.unique_words },
                  { label: "Distinct spelling pairs", value: data.unique_alternatives },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-secondary/30 px-4 py-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums">
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {data.total_submissions === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No submissions have been stored yet. Save a word above to start collecting data.
                </p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4 min-w-0">
                    <h4 className="font-semibold">Most submitted original words</h4>
                    <ul className="space-y-4">
                      {data.top_words.map((row) => (
                        <DistributionBar
                          key={row.word}
                          label={row.word}
                          count={row.submissions}
                          max={biggestWord}
                          detail={`${row.unique_spellings} alternative(s)`}
                        />
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-4 min-w-0">
                    <h4 className="font-semibold">Most common spelling suggestions</h4>
                    <ul className="space-y-4">
                      {data.top_spellings.map((row) => (
                        <DistributionBar
                          key={row.original_word + ":" + row.suggested_spelling}
                          label={`${row.original_word} → ${row.suggested_spelling}`}
                          count={row.submissions}
                          max={biggestAlternative}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="border-t border-border/60 pt-5 space-y-4">
                <h4 className="font-semibold">Recent daily submissions</h4>
                <p className="text-xs text-muted-foreground">
                  Last 14 days · UTC calendar dates · only days with submissions appear
                </p>
                {data.daily_submissions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No submissions in the last 14 days.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {data.daily_submissions.map((row) => (
                      <DistributionBar
                        key={row.day}
                        label={row.day}
                        count={row.submissions}
                        max={biggestDay}
                      />
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Counts represent submissions, not unique visitors. Repeat suggestions
                are counted separately. Statistics update after each saved submission.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
