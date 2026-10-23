import { validateSpellingSubmission } from "../src/lib/spellingSubmission";

const MAX_BODY_BYTES = 2048;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Enable writes only for a deliberate development/preview experiment.
 * Public production submissions will need abuse prevention before activation.
 */
function isConfiguredAndEnabled(): boolean {
  return (
    process.env.SPELLING_SUBMISSIONS_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SECRET_KEY)
  );
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    return json({ enabled: isConfiguredAndEnabled() });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  if (!isConfiguredAndEnabled()) {
    return json({ error: "Database submissions are not enabled here." }, 503);
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Send JSON data." }, 415);
  }

  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    return json({ error: "Submission is too large." }, 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return json({ error: "Submission is too large." }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const validated = validateSpellingSubmission(body);
  if (!validated.ok) {
    return json({ error: validated.error }, 400);
  }

  const baseUrl = process.env.SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;
  let restUrl: URL;
  try {
    restUrl = new URL("/rest/v1/spelling_submissions", baseUrl);
    if (restUrl.protocol !== "https:") {
      return json({ error: "Database connection is not configured correctly." }, 503);
    }
  } catch {
    return json({ error: "Database connection is not configured correctly." }, 503);
  }

  try {
    // New Supabase secret API keys go in the apikey header, NOT a Bearer token.
    const response = await fetch(restUrl, {
      method: "POST",
      headers: {
        "apikey": secretKey,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(validated.value),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("Supabase insertion failed with HTTP status:", response.status);
      return json({ error: "Could not save the spelling. Please try again." }, 502);
    }

    const records: unknown = await response.json();
    const first = Array.isArray(records) ? records[0] : null;
    if (!first || typeof first.id !== "number") {
      return json({ error: "Save could not be confirmed." }, 502);
    }

    return json({
      saved: true,
      submission: {
        id: first.id,
        original_word: validated.value.original_word,
        suggested_spelling: validated.value.suggested_spelling,
      },
    }, 201);
  } catch {
    return json({ error: "Database unavailable. Please try again." }, 502);
  }
}

export default { fetch: handleRequest };
