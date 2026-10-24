/**
 * Local-only read endpoint for practicing SQL-style retrieval.
 *
 * Never expose the server secret key to React. This deliberately rejects
 * non-local requests even on a linked Vercel preview/production deployment.
 * Do not expand this to public access without authentication and privacy review.
 */
const MAX_LIMIT = 30;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isLocalRequest(request: Request): boolean {
  try {
    const host = new URL(request.url).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}

function isEnabled(request: Request): boolean {
  return (
    isLocalRequest(request) &&
    process.env.SPELLING_SUBMISSIONS_ENABLED === "true" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SECRET_KEY)
  );
}

interface SpellingRecord {
  id: number;
  original_word: string;
  suggested_spelling: string;
  created_at: string;
}

function isSpellingRecord(value: unknown): value is SpellingRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "number" &&
    typeof record.original_word === "string" &&
    typeof record.suggested_spelling === "string" &&
    typeof record.created_at === "string"
  );
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!isEnabled(request)) {
    return json({ error: "Saved records are only available during local database testing." }, 403);
  }

  const input = new URL(request.url);
  const filter = (input.searchParams.get("word") ?? "").trim().toLowerCase();
  const sort = input.searchParams.get("sort") ?? "recent";
  const rawLimit = input.searchParams.get("limit") ?? "20";
  const limit = Number(rawLimit);

  if (filter && (filter.length > 60 || !/^[a-z]+(?:['-][a-z]+)*$/.test(filter))) {
    return json({ error: "Filter must be a valid English word (up to 60 characters)." }, 400);
  }
  if (sort !== "recent" && sort !== "oldest") {
    return json({ error: "Invalid sort order." }, 400);
  }
  if (!/^[0-9]+$/.test(rawLimit) || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return json({ error: "Limit must be between 1 and 30." }, 400);
  }

  let restUrl: URL;
  try {
    restUrl = new URL("/rest/v1/spelling_submissions", process.env.SUPABASE_URL);
    if (restUrl.protocol !== "https:") throw new Error("Invalid Supabase protocol");
  } catch {
    return json({ error: "Database connection is not configured correctly." }, 503);
  }

  restUrl.searchParams.set("select", "id,original_word,suggested_spelling,created_at");
  restUrl.searchParams.set("order", sort === "oldest" ? "id.asc" : "id.desc");
  restUrl.searchParams.set("limit", String(limit));
  if (filter) restUrl.searchParams.set("original_word", "eq." + filter);

  try {
    const response = await fetch(restUrl, {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        Accept: "application/json",
        Prefer: "count=exact",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("Supabase lookup failed with HTTP status:", response.status);
      return json({ error: "Could not retrieve saved spellings." }, 502);
    }

    const rawData: unknown = await response.json();
    if (!Array.isArray(rawData) || !rawData.every(isSpellingRecord)) {
      return json({ error: "The database returned unexpected data." }, 502);
    }

    // Supabase/PostgREST includes exact row count after the / when requested.
    // Use null when it is unavailable rather than making up a total.
    const contentRange = response.headers.get("content-range");
    const totalString = contentRange?.split("/")[1];
    const total = totalString && /^[0-9]+$/.test(totalString) ? Number(totalString) : null;

    return json({ records: rawData, total, filter: filter || null, sort });
  } catch {
    return json({ error: "Database unavailable. Try again." }, 502);
  }
}

export default { fetch: handleRequest };
