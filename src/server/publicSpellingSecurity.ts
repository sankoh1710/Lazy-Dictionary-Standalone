import { createHmac } from "node:crypto";

/**
 * Public release is deliberately disabled unless every server-side control is
 * configured AND the request reaches the exact production hostname.
 *
 * Never enable this just to get a preview form working. A missing check must
 * fail closed, not silently fall back to an unprotected INSERT.
 */
export function publicSubmissionConfig(request: Request): {
  hostname: string;
  siteKey: string;
} | null {
  try {
    const url = new URL(request.url);
    const hostname = process.env.PUBLIC_SPELLING_HOSTNAME?.trim().toLowerCase();
    const siteKey = process.env.TURNSTILE_SITE_KEY?.trim();
    if (
      process.env.VERCEL_ENV !== "production" ||
      process.env.PUBLIC_SPELLING_SUBMISSIONS_ENABLED !== "true" ||
      !hostname ||
      !/^[a-z0-9.-]+$/.test(hostname) ||
      hostname !== url.hostname.toLowerCase() ||
      url.protocol !== "https:" ||
      !siteKey ||
      !process.env.TURNSTILE_SECRET_KEY ||
      !process.env.SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY ||
      !process.env.PUBLIC_RATE_LIMIT_PEPPER ||
      process.env.PUBLIC_RATE_LIMIT_PEPPER.length < 32
    ) return null;

    return { hostname, siteKey };
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
 * Only call this after normalizing/validating the two spelling fields.
 * The quota is charged first to bound calls to Cloudflare and Supabase.
 */
export async function authorizePublicSpelling(
  request: Request,
  data: unknown,
  hostname: string,
): Promise<Response | null> {
  const origin = request.headers.get("origin");
  if (origin !== "https://" + hostname) {
    return jsonError("Submission origin not accepted.", 403);
  }

  if (!data || typeof data !== "object" || Array.isArray(data) ||
      !("turnstile_token" in data) ||
      typeof data.turnstile_token !== "string" ||
      data.turnstile_token.length < 1 ||
      data.turnstile_token.length > 2048) {
    return jsonError("Complete the verification challenge before submitting.", 400);
  }

  // Vercel controls this forwarding header at its edge. Never use an arbitrary
  // client-supplied IP header or trust an IP value in the JSON payload.
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (!ip || ip.length > 128) {
    return jsonError("Unable to verify the submission source.", 503);
  }

  const scopeHash = createHmac("sha256", process.env.PUBLIC_RATE_LIMIT_PEPPER!)
    .update(ip)
    .digest("hex");

  try {
    const quotaUrl = new URL(
      "/rest/v1/rpc/consume_public_spelling_quota",
      process.env.SUPABASE_URL!,
    );
    if (quotaUrl.protocol !== "https:") {
      return jsonError("Submission protection is not configured.", 503);
    }

    const quotaResponse = await fetch(quotaUrl, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_scope_hash: scopeHash }),
      signal: AbortSignal.timeout(7000),
    });
    if (!quotaResponse.ok) {
      console.error("Public quota RPC failed:", quotaResponse.status);
      return jsonError("Submission protection temporarily unavailable.", 503);
    }

    const quota: unknown = await quotaResponse.json();
    if (!quota || typeof quota !== "object" || Array.isArray(quota) ||
        !("allowed" in quota) || typeof quota.allowed !== "boolean" ||
        !("retry_after_seconds" in quota) ||
        typeof quota.retry_after_seconds !== "number" ||
        !Number.isInteger(quota.retry_after_seconds) ||
        quota.retry_after_seconds < 0 ||
        quota.retry_after_seconds > 3600) {
      return jsonError("Submission allowance could not be checked.", 503);
    }

    if (!quota.allowed) {
      const retrySeconds = Math.max(1, quota.retry_after_seconds);
      return Response.json({
        error: "Too many submissions. Please try again later.",
        retry_after_seconds: retrySeconds,
      }, {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retrySeconds),
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    return jsonError("Submission protection temporarily unavailable.", 503);
  }

  try {
    const verification = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: data.turnstile_token,
        }),
        signal: AbortSignal.timeout(7000),
      },
    );

    if (!verification.ok) {
      return jsonError("Verification service is temporarily unavailable.", 503);
    }

    const result: unknown = await verification.json();
    if (!result || typeof result !== "object" || Array.isArray(result) ||
        !("success" in result) || result.success !== true ||
        !("hostname" in result) || result.hostname !== hostname ||
        !("action" in result) || result.action !== "spelling_submit") {
      return jsonError("Verification failed or expired. Please try again.", 403);
    }
    return null;
  } catch {
    return jsonError("Verification service is temporarily unavailable.", 503);
  }
}
