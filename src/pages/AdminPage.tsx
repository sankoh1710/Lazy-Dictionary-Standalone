import { useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { SpellingModeration } from "@/components/SpellingModeration";
import { SpellingRecords } from "@/components/SpellingRecords";
import { SpellingAnalytics } from "@/components/SpellingAnalytics";

function isLocalBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Local admin workspace. The route itself is not an authorization boundary:
 * ALL admin APIs separately verify a real Supabase Auth access token against
 * the server-side admin allowlist and reject deployed Preview/Production.
 */
export function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const local = isLocalBrowser();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground font-sans">
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary self-start">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to Lazy Dictionary
          </a>
          <div className="flex items-center gap-3">
            <LockKeyhole className="w-7 h-7 text-primary" aria-hidden="true" />
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Administration
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review spelling suggestions, inspect data and track moderation history.
          </p>
        </header>

        {!local ? (
          <section className="rounded-xl border border-border bg-card p-6" role="status">
            <p className="font-medium">Administration is unavailable on this deployment.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              The current administration tools operate only in local development.
              They are not available to public visitors.
            </p>
          </section>
        ) : (
          <>
            <SpellingModeration
              refreshToken={refreshToken}
              onChanged={() => setRefreshToken((current) => current + 1)}
              onTokenChange={setToken}
            />
            {token && (
              <>
                <SpellingAnalytics token={token} refreshToken={refreshToken} />
                <SpellingRecords token={token} refreshToken={refreshToken} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
