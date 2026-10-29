import {
  authorizedAdminRequest,
  jsonResponse,
  parseSmallJson,
  serviceHeaders,
  supabaseEndpoint,
} from "../src/server/adminAuth";

type ModerationStatus = "pending" | "approved" | "rejected";
interface Submission {
  id: number;
  original_word: string;
  suggested_spelling: string;
  moderation_status: ModerationStatus;
  created_at: string;
  reviewed_at: string | null;
}

function isRecord(item: unknown): item is Submission {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const row = item as Record<string, unknown>;
  return (
    typeof row.id === "number" &&
    typeof row.original_word === "string" &&
    typeof row.suggested_spelling === "string" &&
    ["pending", "approved", "rejected"].includes(String(row.moderation_status)) &&
    typeof row.created_at === "string" &&
    (row.reviewed_at === null || typeof row.reviewed_at === "string")
  );
}

async function handle(request: Request): Promise<Response> {
  if (!["GET", "PATCH", "DELETE"].includes(request.method)) {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }
  if (!await authorizedAdminRequest(request)) {
    return jsonResponse({ error: "Admin login required." }, 401);
  }

  if (request.method === "GET") {
    const status = new URL(request.url).searchParams.get("status") ?? "pending";
    if (!["pending", "approved", "rejected", "all"].includes(status)) {
      return jsonResponse({ error: "Invalid moderation filter." }, 400);
    }
    const query = supabaseEndpoint("/rest/v1/spelling_submissions");
    query.searchParams.set(
      "select",
      "id,original_word,suggested_spelling,moderation_status,created_at,reviewed_at",
    );
    query.searchParams.set("order", "id.desc");
    query.searchParams.set("limit", "30");
    if (status !== "all") query.searchParams.set("moderation_status", "eq." + status);

    try {
      const response = await fetch(query, {
        headers: serviceHeaders({ Prefer: "count=exact" }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        console.error("Moderation read failed:", response.status);
        return jsonResponse({ error: "Could not retrieve moderation records. Has the Phase 6 SQL been run?" }, 502);
      }
      const records: unknown = await response.json();
      if (!Array.isArray(records) || !records.every(isRecord)) {
        return jsonResponse({ error: "Unexpected moderation records format." }, 502);
      }
      const contentRange = response.headers.get("content-range");
      const count = contentRange?.split("/")[1];
      return jsonResponse({
        records,
        total: count && /^[0-9]+$/.test(count) ? Number(count) : null,
      });
    } catch {
      return jsonResponse({ error: "Unable to reach Supabase." }, 502);
    }
  }

  let payload: unknown;
  try {
    payload = await parseSmallJson(request);
  } catch {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  const body = payload as Record<string, unknown>;
  if (typeof body.id !== "number" || !Number.isSafeInteger(body.id) || body.id <= 0) {
    return jsonResponse({ error: "A valid numeric submission ID is required." }, 400);
  }

  if (request.method === "PATCH" &&
      !["pending", "approved", "rejected"].includes(String(body.status))) {
    return jsonResponse({ error: "Invalid moderation decision." }, 400);
  }

  if (request.method === "DELETE" && body.confirm !== "DELETE") {
    return jsonResponse({ error: "Explicit deletion confirmation required." }, 400);
  }

  // After verifying the real Supabase Auth user ID against the server-side
  // allowlist, this server supplies that already-verified UUID to PostgreSQL.
  // Never accept an actor_id provided in the browser request body.
  const action = request.method === "DELETE" ? "deleted" : body.status as string;
  const actorId = process.env.SUPABASE_ADMIN_USER_ID;
  if (!actorId) {
    return jsonResponse({ error: "Admin identity is not configured." }, 503);
  }

  // One database RPC performs the change AND audit append atomically.
  // If the audit insert fails, PostgreSQL rolls back the moderation change.
  const url = supabaseEndpoint("/rest/v1/rpc/admin_moderate_spelling");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: serviceHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify({
        p_id: body.id,
        p_action: action,
        p_actor_id: actorId,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("Audited moderation RPC returned HTTP:", response.status);
      if (response.status === 404) {
        return jsonResponse({
          error: "Audit logging is not installed yet. Run supabase/phase6b_audit_logging.sql in Supabase.",
        }, 503);
      }
      return jsonResponse({ error: "Audited moderation failed; the database change was not confirmed." }, 502);
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return jsonResponse({ error: "Unexpected moderation response." }, 502);
    }
    const value = data as Record<string, unknown>;
    if (value.ok !== true) {
      const reason = value.error;
      if (reason === "not_found") return jsonResponse({ error: "Submission not found." }, 404);
      if (reason === "already_in_state") {
        return jsonResponse({ error: "Submission already has that moderation status." }, 409);
      }
      return jsonResponse({ error: "Invalid moderation operation." }, 400);
    }
    if (typeof value.audit_id !== "number" || !value.record ||
        typeof value.record !== "object") {
      return jsonResponse({ error: "The audit entry could not be confirmed." }, 502);
    }

    return jsonResponse({
      ok: true,
      audit_id: value.audit_id,
      record: value.record,
    });
  } catch {
    return jsonResponse({ error: "Could not reach the audited moderation service." }, 502);
  }
}

export default { fetch: handle };
