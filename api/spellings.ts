import { publicSubmissionConfig, authorizePublicSpelling } from "../src/server/publicSpellingSecurity";
import { validateSpellingSubmission } from "../src/lib/spellingSubmission";

const MAX_BODY_BYTES = 4096; // accommodates the public Turnstile token

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * Enable writes only for an explicitly enabled LOCAL development experiment.
 * Production/Preview writing only occurs via the separately validated
 * publicSubmissionConfig gate, never via this local-only experiment flag.
 */
function isConfiguredAndEnabled(request: Request): boolean {
  let host: string;
  try {
    host = new URL(request.url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    (host === "localhost" || host === "127.0.0.1" || host === "[::1]") &&
    process.env.SPELLING_SUBMISSIONS_ENABLED === "true" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SECRET_KEY)
  );
}

async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "GET") {
    const localMode = isConfiguredAndEnabled(request);
    const publicConfig = publicSubmissionConfig(request);
    if (localMode) return json({ enabled: true, mode: "local" });
    if (publicConfig) return json({
      enabled: true,
      mode: "public",
      environment: publicConfig.environment,
      turnstileSiteKey: publicConfig.siteKey,
    });
    return json({ enabled: false, mode: "preview" });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const localMode = isConfiguredAndEnabled(request);
  const publicConfig = publicSubmissionConfig(request);
  if (!localMode && !publicConfig) {
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

  // Every accepted request consumes an atomic quota BEFORE inserting.
  // Production/staging have a separate HMAC-IP quota + Turnstile gate.
  // Local development keeps its earlier shared demonstration quota.
  if (publicConfig) {
    const denied = await authorizePublicSpelling(request, body, publicConfig.hostname);
    if (denied) return denied;
  }

  // Local development retains the previously tested shared five/minute quota.
  if (localMode) {
  const quotaUrl = new URL("/rest/v1/rpc/consume_local_spelling_quota", baseUrl);
  try {
    const quotaResponse = await fetch(quotaUrl, {
      method: "POST",
      headers: {
        apikey: secretKey,
        "Content-Type": "application/json",
      },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });

    if (!quotaResponse.ok) {
      console.error("Supabase quota lookup failed:", quotaResponse.status);
      if (quotaResponse.status === 404) {
        return json({
          error: "Rate-limit SQL is not installed. Run supabase/phase6b_local_rate_limit.sql in Supabase first.",
        }, 503);
      }
      return json({ error: "Unable to verify submission allowance. Try again later." }, 503);
    }

    const quota: unknown = await quotaResponse.json();
    if (
      !quota ||
      typeof quota !== "object" ||
      Array.isArray(quota) ||
      !("allowed" in quota) ||
      typeof quota.allowed !== "boolean" ||
      !("retry_after_seconds" in quota) ||
      typeof quota.retry_after_seconds !== "number" ||
      !Number.isInteger(quota.retry_after_seconds) ||
      quota.retry_after_seconds < 1 ||
      quota.retry_after_seconds > 60
    ) {
      return json({ error: "Unexpected rate-limit response from the database." }, 503);
    }

    if (!quota.allowed) {
      const seconds = quota.retry_after_seconds;
      return Response.json({
        error: `Local test limit reached (5 valid submissions per minute). Try again in about ${seconds} seconds.`,
        retry_after_seconds: seconds,
      }, {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(seconds),
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    return json({ error: "Rate-limit service unavailable. No record was saved." }, 503);
  }
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
      body: JSON.stringify({
        ...validated.value,
        moderation_status: "pending",
      }),
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
