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

  const restUrl = supabaseEndpoint("/rest/v1/spelling_submissions");
  restUrl.searchParams.set("id", "eq." + body.id);
  restUrl.searchParams.set("select", "id,original_word,suggested_spelling,moderation_status,created_at,reviewed_at");

  const method = request.method;
  const updateStatus = method === "PATCH" ? body.status as ModerationStatus : null;
  const operationBody = method === "PATCH"
    ? JSON.stringify({
        moderation_status: updateStatus,
        reviewed_at: updateStatus === "pending" ? null : new Date().toISOString(),
      })
    : undefined;

  try {
    const result = await fetch(restUrl, {
      method,
      headers: serviceHeaders({
        Prefer: "return=representation",
        ...(method === "PATCH" ? { "Content-Type": "application/json" } : {}),
      }),
      body: operationBody,
      signal: AbortSignal.timeout(8000),
    });
    if (!result.ok) {
      console.error("Moderation mutation failed:", result.status);
      return jsonResponse({ error: "Database moderation operation failed." }, 502);
    }
    const records: unknown = await result.json();
    if (!Array.isArray(records) || records.length !== 1 || !isRecord(records[0])) {
      return jsonResponse({ error: "Record not found or could not confirm operation." }, 404);
    }
    return jsonResponse({ ok: true, record: records[0] });
  } catch {
    return jsonResponse({ error: "Could not reach the database." }, 502);
  }
}

export default { fetch: handle };
