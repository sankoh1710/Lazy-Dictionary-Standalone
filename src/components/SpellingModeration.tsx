import { useEffect, useState, type FormEvent } from "react";
import { LockKeyhole, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SpellingAuditLog } from "./SpellingAuditLog";

type ModerationStatus = "pending" | "approved" | "rejected";
type ModerationFilter = ModerationStatus | "all";

interface Submission {
  id: number;
  original_word: string;
  suggested_spelling: string;
  moderation_status: ModerationStatus;
  created_at: string;
  reviewed_at: string | null;
}

function apiError(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && !Array.isArray(value) &&
      "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return fallback;
}

/**
 * Educational local-only admin workflow. Token is held only in React state,
 * never in localStorage or cookies; a refresh requires signing in again.
 */
export function SpellingModeration({
  refreshToken,
  onChanged,
}: {
  refreshToken: number;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);
  const [filter, setFilter] = useState<ModerationFilter>("pending");
  const [records, setRecords] = useState<Submission[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginBusy) return;
    setError("");
    setMessage("");
    setLoginBusy(true);
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(result, "Sign-in failed."));
      if (!result || typeof result !== "object" || !("access_token" in result) ||
          typeof result.access_token !== "string") {
        throw new Error("Authentication response was invalid.");
      }
      setToken(result.access_token);
      setPassword("");
      setMessage("Admin signed in for this browser session.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setRecords([]);
      setTotal(null);
      return;
    }
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ status: filter });
        const response = await fetch("/api/admin-submissions?" + params.toString(), {
          headers: { Authorization: "Bearer " + token },
          signal: controller.signal,
          cache: "no-store",
        });
        const result: unknown = await response.json();
        if (response.status === 401) {
          setToken(null);
          throw new Error("Session expired or admin access denied. Sign in again.");
        }
        if (!response.ok) throw new Error(apiError(result, "Could not load moderation records."));
        if (!result || typeof result !== "object" ||
            !("records" in result) || !Array.isArray(result.records) ||
            !("total" in result) ||
            !(result.total === null || typeof result.total === "number")) {
          throw new Error("Unexpected moderation response.");
        }
        if (!controller.signal.aborted) {
          setRecords(result.records as Submission[]);
          setTotal(result.total);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Could not load records.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [token, filter, refreshCount, refreshToken]);

  async function moderate(id: number, action: ModerationStatus | "delete") {
    if (!token || busyId !== null) return;
    if (action === "delete" &&
        !window.confirm(`Permanently delete test submission #${id}? This cannot be undone.`)) {
      return;
    }

    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin-submissions", {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          action === "delete"
            ? { id, confirm: "DELETE" }
            : { id, status: action },
        ),
      });
      const result: unknown = await response.json();
      if (response.status === 401) {
        setToken(null);
        throw new Error("Session expired. Sign in again.");
      }
      if (!response.ok) throw new Error(apiError(result, "Moderation operation failed."));
      setMessage(
        action === "delete"
          ? `Deleted test submission #${id}.`
          : `Marked submission #${id} as ${action}.`,
      );
      setRefreshCount((count) => count + 1);
      onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Moderation operation failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby="moderation-heading" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 ml-2">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 id="moderation-heading" className="text-xl font-semibold">
          Admin moderation
        </h3>
      </div>
      <Card className="rounded-2xl border-border/60 bg-card shadow-sm">
        <CardContent className="p-5 sm:p-7 flex flex-col gap-5">
          <p className="text-xs text-muted-foreground">
            Local testing only · Supabase Auth sign-in · test data
          </p>
          {!token ? (
            <form onSubmit={(event) => void login(event)} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Sign in with your allowlisted Supabase Auth account to review or remove
                spelling submissions. The account is separate from your Supabase Dashboard login.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="admin-email" className="text-sm font-medium">Admin email</label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="username"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="admin-password" className="text-sm font-medium">Password</label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loginBusy || !email || !password}
                className="self-start inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
              >
                <LockKeyhole className="w-4 h-4" aria-hidden="true" />
                {loginBusy ? "Signing in…" : "Admin sign in"}
              </button>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 items-end justify-between">
                <div className="space-y-2">
                  <label htmlFor="moderation-filter" className="block text-sm font-medium">
                    Moderation status
                  </label>
                  <select
                    id="moderation-filter"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as ModerationFilter)}
                    className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="all">All</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRefreshCount((count) => count + 1)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" /> Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setToken(null);
                      setRecords([]);
                      setMessage("");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading…" : `${total ?? "Unknown number of"} matching record(s)`}
                {" · "}Up to 30 shown
              </p>
              {!loading && records.length === 0 && (
                <p className="text-sm text-muted-foreground">No records in this filter.</p>
              )}
              {records.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {records.map((record) => (
                    <li
                      key={record.id}
                      className="rounded-xl border border-border/60 p-4 flex flex-col gap-3"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground">#{record.id}</span>
                          <strong className="break-all">{record.original_word}</strong>
                          <span className="text-muted-foreground">→</span>
                          <strong className="text-primary break-all">{record.suggested_spelling}</strong>
                        </div>
                        <span className="text-xs capitalize text-muted-foreground">
                          {record.moderation_status}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {(["approved", "rejected", "pending"] as ModerationStatus[]).map((action) => (
                          <button
                            key={action}
                            type="button"
                            disabled={busyId !== null || action === record.moderation_status}
                            onClick={() => void moderate(record.id, action)}
                            className="rounded-lg border border-border px-3 py-2 text-xs font-medium capitalize hover:bg-secondary/50 disabled:opacity-40"
                          >
                            {action === "approved" ? "Approve" :
                              action === "rejected" ? "Reject" : "Set pending"}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => void moderate(record.id, "delete")}
                          className="rounded-lg border border-destructive/30 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        >
                          Delete test record
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <SpellingAuditLog token={token} refreshToken={refreshToken + refreshCount} />
            </>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
          <p className="text-xs text-muted-foreground">
            Your login token stays in browser memory and disappears on refresh.
            Do not use this local moderation interface for public launch without
            strengthening sessions, public-facing rate limits, and monitoring.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
