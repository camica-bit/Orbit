import { getAuthUser } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

// GET /api/tasks — returns all pending/active tasks for current user ordered by priority
export async function GET() {
  const { supabase, user } = await getAuthUser();

  let query = supabase
    .from("tasks")
    .select("*")
    .in("status", ["pending", "active"])
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (user) {
    query = query.eq("user_id", user.id);
  } else {
    // If no user session, isolate by returning empty
    return Response.json({ tasks: [] });
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tasks: data });
}

// POST /api/tasks — create one or more tasks scoped to current user
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const body = await request.json();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawTasks = Array.isArray(body) ? body : [body];
  const tasksWithUser = rawTasks.map((t) => ({
    ...t,
    user_id: user.id,
  }));

  const { data, error } = await supabase.from("tasks").insert(tasksWithUser).select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ tasks: data }, { status: 201 });
}

// PATCH /api/tasks — update task for current user
export async function PATCH(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const { id, ...updates } = await request.json();

  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ task: data });
}
