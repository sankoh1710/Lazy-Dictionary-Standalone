/**
 * Shared server-only authorization helpers for the local moderation exercise.
 * Supabase Auth validates user access tokens. We separately allowlist one
 * immutable Auth user UUID so ordinary signed-in accounts are NOT admins.
 */
export function localAdminAvailable(request: Request): boolean {
  let hostname: string;
  try {
    hostname = new URL(request.url).hostname.toLowerCase();
    const url = new URL(process.env.SUPABASE_URL ?? "");
    if (url.protocol !== "https:") return false;
  } catch {
    return false;
  }

  return (
    (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "development") &&
    process.env.SPELLING_SUBMISSIONS_ENABLED === "true" &&
    Boolean(process.env.SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SECRET_KEY) &&
    Boolean(process.env.SUPABASE_PUBLISHABLE_KEY) &&
    Boolean(process.env.SUPABASE_ADMIN_USER_ID)
  );
}

export function supabaseEndpoint(path: string): URL {
  const base = new URL(process.env.SUPABASE_URL!);
  if (base.protocol !== "https:") throw new Error("Expected HTTPS Supabase URL");
  return new URL(path, base);
}

export function serviceHeaders(extra: Record<string, string> = {}): HeadersInit {
  // This key bypasses RLS and is NEVER sent to the browser.
  return {
    apikey: process.env.SUPABASE_SECRET_KEY!,
    ...extra,
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function parseSmallJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("Send JSON.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > 2048) {
    throw new Error("Request body is too large.");
  }
  return JSON.parse(text) as unknown;
}

export async function isAuthorizedAdminToken(token: string): Promise<boolean> {
  if (token.length < 20 || token.length > 4096) return false;
  try {
    // Verifies the access token against the Auth service; never trust an
    // unverified JWT payload or an email address supplied by the browser.
    const result = await fetch(supabaseEndpoint("/auth/v1/user"), {
      headers: {
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
        Authorization: "Bearer " + token,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) return false;
    const body: unknown = await result.json();
    return (
      !!body && typeof body === "object" && !Array.isArray(body) &&
      "id" in body && typeof body.id === "string" &&
      body.id === process.env.SUPABASE_ADMIN_USER_ID
    );
  } catch {
    return false;
  }
}

export async function authorizedAdminRequest(request: Request): Promise<boolean> {
  if (!localAdminAvailable(request)) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(authorization);
  return Boolean(match && await isAuthorizedAdminToken(match[1]));
}
