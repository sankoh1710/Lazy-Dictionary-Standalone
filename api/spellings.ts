import { createHmac } from "node:crypto";
import { isIP } from "node:net";

const MAX_BYTES = 2048;
const wordPattern = /^[a-z]+(?:['-][a-z]+)*$/;

function reply(value: unknown, status = 200, retryAfter?: number): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
    },
  });
}

function modes(request: Request) {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") &&
    process.env.SPELLING_SUBMISSIONS_ENABLED === "true";

  const publicSite =
    process.env.VERCEL_ENV === "production" &&
    process.env.PUBLIC_SPELLING_SUBMISSIONS_ENABLED === "true" &&
    url.protocol === "https:" &&
    url.hostname === (process.env.PUBLIC_SPELLING_HOSTNAME || "").toLowerCase() &&
    url.hostname.length > 0 &&
    !!process.env.PUBLIC_RATE_LIMIT_PEPPER &&
    process.env.PUBLIC_RATE_LIMIT_PEPPER.length >= 32 &&
    !process.env.PUBLIC_RATE_LIMIT_PEPPER.startsWith("REPLACE_");

  const base = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || "";
  let configured = false;
  try {
    configured = new URL(base).protocol === "https:" && !!key;
  } catch {
    // Reject malformed database settings without revealing them.
  }
  return { local: local && configured, publicSite: publicSite && configured };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { local, publicSite } = modes(request);
    if (request.method === "GET") {
      return reply({ enabled: local || publicSite });
    }
    if (request.method !== "POST") {
      return reply({ error: "Method not allowed." }, 405);
    }
    if (!local && !publicSite) {
      return reply({ error: "Submissions are not open yet." }, 503);
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return reply({ error: "Send a JSON request." }, 415);
    }
    if (Number(request.headers.get("content-length")) > MAX_BYTES) {
      return reply({ error: "Request too large." }, 413);
    }

    let fields: unknown;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) {
        return reply({ error: "Request too large." }, 413);
      }
      fields = JSON.parse(raw) as unknown;
    } catch {
      return reply({ error: "Invalid JSON." }, 400);
    }
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
      return reply({ error: "Enter both spelling fields." }, 400);
    }
    const data = fields as Record<string, unknown>;
    if (typeof data.original_word !== "string" || typeof data.suggested_spelling !== "string") {
      return reply({ error: "Enter both spelling fields." }, 400);
    }
    const original_word = data.original_word.trim().toLowerCase();
    const suggested_spelling = data.suggested_spelling.trim().toLowerCase();
    if (!original_word || !suggested_spelling ||
        original_word.length > 60 || suggested_spelling.length > 60 ||
        !wordPattern.test(original_word) || !wordPattern.test(suggested_spelling) ||
        original_word === suggested_spelling) {
      return reply({ error: "Enter two different words using English letters (up to 60 characters)." }, 400);
    }

    const base = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SECRET_KEY!;

    if (publicSite) {
      // Basic abuse protection, not a guarantee that every request is human.
      if (request.headers.get("origin") !== "https://" + new URL(request.url).hostname) {
        return reply({ error: "Invalid submission origin." }, 403);
      }
      // Vercel supplies this header; never accept an IP address in JSON.
      const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
      if (!ip || isIP(ip) === 0) {
        return reply({ error: "Submission source unavailable." }, 503);
      }
      const hash = createHmac("sha256", process.env.PUBLIC_RATE_LIMIT_PEPPER!)
        .update(ip).digest("hex");
      try {
        const limitResponse = await fetch(new URL("/rest/v1/rpc/consume_spelling_submission_quota", base), {
          method: "POST",
          headers: { apikey: key, "Content-Type": "application/json" },
          body: JSON.stringify({ p_scope_hash: hash }),
          signal: AbortSignal.timeout(8000),
        });
        if (!limitResponse.ok) return reply({ error: "Submission limit service unavailable." }, 503);
        const quota: unknown = await limitResponse.json();
        if (!quota || typeof quota !== "object" || Array.isArray(quota) ||
            !("allowed" in quota) || typeof quota.allowed !== "boolean" ||
            !("retry_after_seconds" in quota) ||
            typeof quota.retry_after_seconds !== "number" ||
            quota.retry_after_seconds < 1 || quota.retry_after_seconds > 60) {
          return reply({ error: "Submission limit unavailable." }, 503);
        }
        if (!quota.allowed) {
          const seconds = Math.ceil(quota.retry_after_seconds);
          return reply({ error: "Too many submissions. Try again shortly." }, 429, seconds);
        }
      } catch {
        return reply({ error: "Submission protection unavailable." }, 503);
      }
    }

    try {
      const response = await fetch(new URL("/rest/v1/spelling_submissions", base), {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ original_word, suggested_spelling }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        console.error("Spelling insert failed:", response.status);
        return reply({ error: "Could not save your suggestion." }, 502);
      }
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || !rows[0] || typeof rows[0].id !== "number") {
        return reply({ error: "The database did not confirm the save." }, 502);
      }
      return reply({ saved: true }, 201);
    } catch {
      return reply({ error: "Database temporarily unavailable." }, 502);
    }
  },
};
