import {
  isAuthorizedAdminToken,
  jsonResponse,
  localAdminAvailable,
  parseSmallJson,
  supabaseEndpoint,
} from "../src/server/adminAuth";

/**
 * Small local-development login proxy. Only an allowlisted Supabase Auth user
 * can receive a short-lived token from this route; the refresh token is
 * intentionally never returned or persisted. Sign in again after expiry.
 */
async function handle(request: Request): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
  if (!localAdminAvailable(request)) {
    return jsonResponse({ error: "Admin login is disabled or not configured." }, 403);
  }

  let body: unknown;
  try {
    body = await parseSmallJson(request);
  } catch {
    return jsonResponse({ error: "Invalid login request." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "Invalid login request." }, 400);
  }

  const login = body as Record<string, unknown>;
  if (
    typeof login.email !== "string" ||
    typeof login.password !== "string" ||
    login.email.length > 254 ||
    login.password.length > 512 ||
    !login.email.includes("@") ||
    !login.password
  ) {
    return jsonResponse({ error: "Enter a valid email and password." }, 400);
  }

  try {
    const url = supabaseEndpoint("/auth/v1/token");
    url.searchParams.set("grant_type", "password");
    const result = await fetch(url, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_PUBLISHABLE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: login.email, password: login.password }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!result.ok) {
      return jsonResponse({ error: "Sign-in failed or admin access was not granted." }, 401);
    }

    const data: unknown = await result.json();
    if (!data || typeof data !== "object" || !("access_token" in data) ||
        typeof data.access_token !== "string") {
      return jsonResponse({ error: "Authentication did not return a usable session." }, 502);
    }

    if (!await isAuthorizedAdminToken(data.access_token)) {
      return jsonResponse({ error: "Sign-in failed or admin access was not granted." }, 403);
    }

    return jsonResponse({ access_token: data.access_token });
  } catch {
    return jsonResponse({ error: "Authentication service is unavailable." }, 502);
  }
}
export default { fetch: handle };
