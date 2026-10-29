import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";

interface AuditEvent {
  id: number;
  submission_id: number;
  original_word: string;
  suggested_spelling: string;
  actor_id: string;
  action: "approved" | "rejected" | "pending" | "deleted";
  previous_status: string;
  new_status: string | null;
  changed_at: string;
}

function isAuditResponse(value: unknown): value is {
  events: AuditEvent[];
  total: number;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.events) &&
    typeof data.total === "number" &&
    data.events.every((entry: unknown) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
      const item = entry as Record<string, unknown>;
      return typeof item.id === "number" &&
        typeof item.submission_id === "number" &&
        typeof item.actor_id === "string" &&
        typeof item.original_word === "string" &&
        typeof item.suggested_spelling === "string" &&
        typeof item.action === "string" &&
        typeof item.previous_status === "string" &&
        (item.new_status === null || typeof item.new_status === "string") &&
        typeof item.changed_at === "string";
    })
  );
}

/** History is fetched only while the allowlisted admin is signed in. */
export function SpellingAuditLog({
  token,
  refreshToken,
}: {
  token: string;
  refreshToken: number;
}) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin-audit", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          const errorText = data && typeof data === "object" &&
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Unable to load moderation history.";
          throw new Error(errorText);
        }
        if (!isAuditResponse(data)) throw new Error("Invalid moderation history response.");
        if (!controller.signal.aborted) {
          setEvents(data.events);
          setTotal(data.total);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Could not load audit records.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [token, refreshToken, refreshCount]);

  return (
    <div className="space-y-3 border-t border-border/60 pt-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" aria-hidden="true" />
          <h4 className="font-semibold">Moderation history</h4>
        </div>
        <button
          type="button"
          onClick={() => setRefreshCount((value) => value + 1)}
          disabled={loading}
          className="flex gap-2 items-center rounded-lg border border-border px-3 py-2 text-xs disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh history
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Local audit trail · {loading ? "Loading…" : `${total} event(s)`} · 30 most recent displayed.
        History begins after the Phase 6B audit migration.
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading audit events…</p>}
      {!loading && !error && events.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No audit events yet. Approve or reject a test submission above to create one.
        </p>
      )}
      {!loading && !error && events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[690px] w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/60">
                <th scope="col" className="px-2 py-2">Event</th>
                <th scope="col" className="px-2 py-2">Submission</th>
                <th scope="col" className="px-2 py-2">Change</th>
                <th scope="col" className="px-2 py-2">Admin ID</th>
                <th scope="col" className="px-2 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-border/40">
                  <td className="px-2 py-3 tabular-nums text-muted-foreground">#{event.id}</td>
                  <td className="px-2 py-3">
                    <span className="font-medium">#{event.submission_id}</span>
                    <span className="block text-xs text-muted-foreground break-all">
                      {event.original_word} → {event.suggested_spelling}
                    </span>
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    {event.previous_status} → {event.new_status ?? "deleted"}
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                    {event.actor_id.slice(0, 8)}…
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(event.changed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Audit entries remain after a test record is deleted. This is a local
        application audit trail, not an immutable log against database owners.
      </p>
    </div>
  );
}
