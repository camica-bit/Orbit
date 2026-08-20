import { getAuthUser } from "@/lib/supabase/server";
import type { NextRequest } from "next/server";

// POST /api/sessions — save a completed focus session scoped to current user
export async function POST(request: NextRequest) {
  const { supabase, user } = await getAuthUser();
  const body = await request.json();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { task_id, task_title, estimated_mins, actual_mins, efficiency_score, streak } = body;

  if (!task_title || !estimated_mins) {
    return Response.json({ error: "task_title and estimated_mins required" }, { status: 400 });
  }

  // Persist session
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      task_id: task_id ?? null,
      task_title,
      estimated_mins,
      actual_mins,
      efficiency_score,
      streak,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Mark the task as completed if task_id provided
  if (task_id) {
    await supabase
      .from("tasks")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", task_id)
      .eq("user_id", user.id);
  }

  return Response.json({ session: data }, { status: 201 });
}

// GET /api/sessions — get last N sessions for streak/stats for current user
export async function GET() {
  const { supabase, user } = await getAuthUser();

  if (!user) {
    return Response.json({ sessions: [] });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data });
}
