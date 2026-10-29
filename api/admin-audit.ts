import {
  authorizedAdminRequest,
  jsonResponse,
  serviceHeaders,
  supabaseEndpoint,
} from "../src/server/adminAuth";

/**
 * Local-only, authenticated read of moderation history.
 * Data comes from a restricted PostgreSQL RPC, not a publicly exposed table.
 */
async function handle(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  if (!await authorizedAdminRequest(request)) {
    return jsonResponse({ error: "Admin login required." }, 401);
  }

  const limit = 30;
  try {
    const response = await fetch(
      supabaseEndpoint("/rest/v1/rpc/list_spelling_audit_events"),
      {
        method: "POST",
        headers: serviceHeaders({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        body: JSON.stringify({ p_limit: limit }),
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      console.error("Audit read RPC returned HTTP:", response.status);
      if (response.status === 404) {
        return jsonResponse({
          error: "Audit SQL not installed. Run supabase/phase6b_audit_logging.sql.",
        }, 503);
      }
      return jsonResponse({ error: "Could not retrieve audit history." }, 502);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonResponse({ error: "Invalid audit response." }, 502);
    }
    const value = data as Record<string, unknown>;
    if (!Array.isArray(value.events) ||
        typeof value.total !== "number" ||
        !Number.isSafeInteger(value.total)) {
      return jsonResponse({ error: "Unexpected audit response from database." }, 502);
    }

    const valid = value.events.every((event: unknown) => {
      if (!event || typeof event !== "object" || Array.isArray(event)) return false;
      const row = event as Record<string, unknown>;
      return (
        typeof row.id === "number" &&
        typeof row.submission_id === "number" &&
        typeof row.actor_id === "string" &&
        typeof row.original_word === "string" &&
        typeof row.suggested_spelling === "string" &&
        ["approved", "rejected", "pending", "deleted"].includes(String(row.action)) &&
        typeof row.previous_status === "string" &&
        (row.new_status === null || typeof row.new_status === "string") &&
        typeof row.changed_at === "string"
      );
    });

    if (!valid) return jsonResponse({ error: "Invalid audit event format." }, 502);

    return jsonResponse({ events: value.events, total: value.total });
  } catch {
    return jsonResponse({ error: "Audit service is unavailable." }, 502);
  }
}

export default { fetch: handle };
