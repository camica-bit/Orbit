import { getAuthUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { normalizeClockTime, withDisplayableTime } from "@/lib/time";
import type { NextRequest } from "next/server";

type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

/**
 * Columns a client is allowed to write. Spreading the request body let a caller
 * set anything at all — `user_id`, `created_at`, another user's `id`.
 */
const WRITABLE = [
  "title",
  "description",
  "estimated_mins",
  "type",
  "scheduled_time",
  "scheduled_date",
  "icon",
  "meta",
  "priority",
  "status",
] as const;

function pickWritable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  // A raw "2 PM" from the lock-time prompt is stored normalised, so the read
  // path never has to repair it later.
  if (typeof out.scheduled_time === "string") {
    out.scheduled_time = normalizeClockTime(out.scheduled_time);
    if (out.scheduled_time === null) out.type = "flexible";
  }
  return out;
}

// GET /api/tasks — returns all pending/active tasks for current user ordered by priority
export async function GET() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ tasks: [] });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["pending", "active"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!tasks) return Response.json({ tasks: [] });

  // Legacy rows may hold a phrase like "after my nap". Present them as flexible
  // rather than rewriting them — a GET used to persist `scheduled_time: null`
  // here and permanently erase whatever the user had.
  const normalized = tasks.map(withDisplayableTime);

  return Response.json({ tasks: normalized });
}

// POST /api/tasks — create one or more tasks scoped to current user
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawTasks = (Array.isArray(body) ? body : [body]).filter(
    (t): t is Record<string, unknown> => typeof t === "object" && t !== null
  );
  if (rawTasks.length === 0) {
    return Response.json({ error: "at least one task is required" }, { status: 400 });
  }

  const rows: TaskInsert[] = [];
  for (const raw of rawTasks) {
    const fields = pickWritable(raw);
    const title = typeof fields.title === "string" ? fields.title.trim() : "";
    if (!title) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }
    // Key names are whitelisted above; Postgres rejects wrong value types.
    rows.push({ ...fields, title, user_id: user.id } as TaskInsert);
  }

  const { data, error } = await supabase.from("tasks").insert(rows).select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tasks: data }, { status: 201 });
}

// PATCH /api/tasks — update task for current user
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthUser();

  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = body;
  if (typeof id !== "string" || !id) return Response.json({ error: "id required" }, { status: 400 });

  const updates = pickWritable(body);
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "no writable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates as TaskUpdate)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ task: data });
}
