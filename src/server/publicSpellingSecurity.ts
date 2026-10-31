import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/**
 * Minimal production-only visitor submission protection.
 *
 * No staging domain, CAPTCHA account, or new administration service is
 * required. All four protections must pass before the API writes:
 * explicit Production enablement, exact HTTPS hostname, same-site browser
 * Origin, and an atomic per-client PostgreSQL quota.
 *
 * Rate limits are not bot-proof, but are appropriate for an initial small
 * public beta. The secret key and HMAC pepper remain server-side.
 */
export function publicSubmissionConfig(request: Request): {
  hostname: string;
} | null {
  try {
    const url = new URL(request.url);
    const hostname = process.env.PUBLIC_SPELLING_HOSTNAME?.trim().toLowerCase();
    if (
      process.env.VERCEL_ENV !== "production" ||
      process.env.PUBLIC_SPELLING_SUBMISSIONS_ENABLED !== "true" ||
      !hostname ||
      !/^[a-z0-9.-]+$/.test(hostname) ||
      hostname !== url.hostname.toLowerCase() ||
      url.protocol !== "https:" ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY ||
      !process.env.PUBLIC_RATE_LIMIT_PEPPER ||
      process.env.PUBLIC_RATE_LIMIT_PEPPER.length < 32
    ) return null;
    return { hostname };
  } catch {
    return null;
  }
}

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/**
 * Charges at most one allowance for each validated, same-origin attempt.
 * Vercel provides x-vercel-forwarded-for at its edge; it is not taken from
 * request JSON and Vercel normalizes the incoming client IP headers.
 *
 * The database receives only an HMAC digest, never a raw client IP.
 * Throws no credentials or raw IP values into the response or logs.
 */
export async function authorizePublicSpelling(
  request: Request,
  hostname: string,
): Promise<Response | null> {
  if (request.headers.get("origin") !== "https://" + hostname) {
    return jsonError("Submission origin not accepted.", 403);
  }

  const raw = request.headers.get("x-vercel-forwarded-for");
  const ip = raw?.split(",")[0]?.trim();
  if (!ip || isIP(ip) === 0) {
    return jsonError("Unable to verify the submission source.", 503);
  }

  const scopeHash = createHmac("sha256", process.env.PUBLIC_RATE_LIMIT_PEPPER!)
    .update(ip).digest("hex");

  try {
    const quotaUrl = new URL(
      "/rest/v1/rpc/consume_public_spelling_quota",
      process.env.SUPABASE_URL!,
    );
    if (quotaUrl.protocol !== "https:") {
      return jsonError("Submission protection is not configured.", 503);
    }

    const response = await fetch(quotaUrl, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_scope_hash: scopeHash }),
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      console.error("Public spelling quota lookup failed:", response.status);
      return jsonError("Submission protection temporarily unavailable.", 503);
    }

    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        !("allowed" in value) || typeof value.allowed !== "boolean" ||
        !("retry_after_seconds" in value) ||
        typeof value.retry_after_seconds !== "number" ||
        !Number.isInteger(value.retry_after_seconds) ||
        value.retry_after_seconds < 0 ||
        value.retry_after_seconds > 3600) {
      return jsonError("Unable to verify submission allowance.", 503);
    }

    if (!value.allowed) {
      const seconds = Math.max(1, value.retry_after_seconds);
      return Response.json({
        error: `Too many submissions. Please try again in about ${seconds} seconds.`,
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

    return null;
  } catch {
    return jsonError("Submission protection temporarily unavailable.", 503);
  }
}
