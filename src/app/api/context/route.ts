import { getAuthUser } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

// GET /api/context — all context items for current user, major events first
export async function GET() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ items: [] });
  }

  const { data, error } = await supabase
    .from("context_items")
    .select("*")
    .eq("user_id", user.id)
    .order("is_major_event", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ items: data });
}

/**
 * Keyword categories. The browser used to run its own copy of these regexes;
 * two copies of the same rules drift the moment either side is edited, so the
 * server is now the only place that decides a category.
 */
const CATEGORY_RULES: [RegExp, string][] = [
  [/gym|fitness|workout|run|swim|sport|exercise|lift/, "Fitness"],
  [/class|lecture|university|course|study|exam|assignment|homework/, "Academic"],
  [/work|project|deep|focus|productivity|deadline|client|code/, "Workstyle"],
  [/interest|hobby|watch|read|music|game|f1|race|movie/, "Interests"],
];

function deriveCategory(content: string): string {
  const lower = content.toLowerCase();
  return CATEGORY_RULES.find(([re]) => re.test(lower))?.[1] ?? "General";
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/context — create a new context item for current user
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const body = await request.json();
  const { category, content, color, bg_color, tags, is_major_event, event_date } = body;

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!content?.trim()) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  if (event_date != null && !DATE_KEY.test(event_date)) {
    return Response.json({ error: "event_date must be YYYY-MM-DD" }, { status: 400 });
  }

  // A date is what makes something a countdown, so it implies the flag.
  const isMajor = Boolean(is_major_event ?? event_date);

  const { data, error } = await supabase
    .from("context_items")
    .insert({
      user_id: user.id,
      category: category ?? (isMajor ? "Major Event" : deriveCategory(content)),
      content: content.trim(),
      // Left null so the client's palette governs; baking a colour in here
      // froze every existing row against later theme changes.
      color: color ?? null,
      bg_color: bg_color ?? null,
      tags: tags ?? [],
      is_major_event: isMajor,
      event_date: event_date ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data }, { status: 201 });
}

/**
 * Columns a client may write. Spreading the body let a caller set `user_id`,
 * `created_at`, or any other column outright.
 */
const WRITABLE = [
  "category",
  "content",
  "color",
  "bg_color",
  "tags",
  "is_major_event",
  "event_date",
] as const;

// PATCH /api/context — update a context item by id for current user
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const body: Record<string, unknown> = await request.json();
  const { id } = body;

  if (typeof id !== "string" || !id) return Response.json({ error: "id required" }, { status: 400 });
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (body.event_date != null && !DATE_KEY.test(String(body.event_date))) {
    return Response.json({ error: "event_date must be YYYY-MM-DD" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "no writable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("context_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data });
}

// DELETE /api/context — delete a context item by id for current user
export async function DELETE(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const { id } = await request.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("context_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
