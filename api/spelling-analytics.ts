import { authorizedAdminRequest } from "../src/server/adminAuth";

/**
 * Phase 5: local-only aggregate analytics (read-only).
 * The browser never receives the Supabase secret key. PostgreSQL performs
 * COUNT / GROUP BY inside public.spelling_analytics(), invoked by this API.
 */
function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function enabledForLocalDevelopment(request: Request): boolean {
  let hostname: string;
  try {
    hostname = new URL(request.url).hostname.toLowerCase();
  } catch {
    return false;
  }

  return (
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") &&
    process.env.SPELLING_SUBMISSIONS_ENABLED === "true" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SECRET_KEY)
  );
}

function validCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isAnalytics(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const stats = value as Record<string, unknown>;
  if (
    !validCount(stats.total_submissions) ||
    !validCount(stats.unique_words) ||
    !validCount(stats.unique_alternatives) ||
    !Array.isArray(stats.top_words) ||
    !Array.isArray(stats.top_spellings) ||
    !Array.isArray(stats.daily_submissions)
  ) return false;

  return (
    stats.top_words.every((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const row = item as Record<string, unknown>;
      return typeof row.word === "string" && validCount(row.submissions) &&
        validCount(row.unique_spellings);
    }) &&
    stats.top_spellings.every((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const row = item as Record<string, unknown>;
      return typeof row.original_word === "string" &&
        typeof row.suggested_spelling === "string" && validCount(row.submissions);
    }) &&
    stats.daily_submissions.every((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const row = item as Record<string, unknown>;
      return typeof row.day === "string" && validCount(row.submissions);
    })
  );
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Method not allowed." }, 405);
  if (!await authorizedAdminRequest(request)) {
    return json({ error: "An authorized admin session is required." }, 401);
  }

  let url: URL;
  try {
    url = new URL("/rest/v1/rpc/spelling_analytics", process.env.SUPABASE_URL);
    if (url.protocol !== "https:") throw new Error("Invalid protocol");
  } catch {
    return json({ error: "Supabase URL is invalid." }, 503);
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // After adding the API code, users still need to create the SQL function
      // manually in the right Supabase project.
      if (response.status === 404) {
        return json({
          error: "Analytics SQL function not found. Run supabase/phase5_spelling_analytics.sql in Supabase SQL Editor, then refresh.",
        }, 424);
      }
      console.error("Supabase analytics request failed with status", response.status);
      return json({ error: "Unable to fetch database statistics." }, 502);
    }

    const data: unknown = await response.json();
    if (!isAnalytics(data)) {
      return json({ error: "Unexpected analytics response. Check your SQL function." }, 502);
    }
    return json(data);
  } catch {
    return json({ error: "Could not connect to the database analytics function." }, 502);
  }
}

export default { fetch: handleRequest };
