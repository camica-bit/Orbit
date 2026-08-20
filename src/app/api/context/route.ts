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

  const { data, error } = await supabase
    .from("context_items")
    .insert({
      user_id: user.id,
      category: category ?? "General",
      content: content.trim(),
      color: color ?? "var(--secondary)",
      bg_color: bg_color ?? "var(--secondary-container)",
      tags: tags ?? [],
      is_major_event: is_major_event ?? false,
      event_date: event_date ?? null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data }, { status: 201 });
}

// PATCH /api/context — update a context item by id for current user
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const { id, ...updates } = await request.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
